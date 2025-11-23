<template>
    <div class="ds-lobby-container">
        <!-- Left / Info panel -->
        <aside class="ds-lobby-left-panel">
            <header class="ds-lobby-header">
                <h2 class="ds-lobby-name">{{ lobby.lobbyName }}</h2>
                <p class="ds-lobby-sub">
                    Lobby ID:
                    <span class="id">{{ lobby.lobbyId || '—' }}</span>
                    <button class="btn tiny" @click="copyLobbyId" :aria-label="'Copy lobby id'">
                        {{ copied ? 'Copied' : 'Copy' }}
                    </button>
                </p>
            </header>

            <div class="ds-lobby-status">
                <span :class="['status-badge', lobbyStatus === 'Ready to send files' ? 'ready' : 'not-ready']">
                    {{ lobbyStatus }}
                </span>
            </div>

            <section class="ds-lobby-members" v-if="lobby.lobbyMembers.length > 0">
                <h4>Members</h4>
                <ul>
                    <li v-for="user in lobby.lobbyMembers" :key="user.memberId" class="member-item">
                        <div class="avatar">{{ user.memberName.charAt(0).toUpperCase() }}</div>
                        <div class="member-info">
                            <div class="member-name">{{ user.memberName }}</div>
                            <div class="member-id">{{ user.memberId }}</div>
                        </div>
                    </li>
                </ul>
            </section>

            <div class="ds-lobby-actions-compact">
                <button class="btn ghost" @click="leaveLobby()">Leave Lobby</button>
            </div>
        </aside>

        <!-- Right / Actions & file transfer -->
        <main class="ds-lobby-right-panel">
            <div class="ds-actions-top">
                <label class="file-input-label">
                    <!-- accept limits what the file picker shows (extensions and MIME types) -->
                    <input type="file" ref="fileInput" multiple class="file-input"
                        accept=".txt,.pdf,image/png,image/jpeg,image/gif,application/pdf,text/plain"
                        @change="handleFileChange"/>
                    <span class="btn primary">{{ selectedCount > 0 ? `${selectedCount} selected` : 'Choose files' }}</span>
                </label>

                <div class="action-buttons">
                    <button class="btn primary" @click="sendFiles()">Send Files</button>
                    <button class="btn" @click="leaveLobby()">Leave</button>
                </div>
            </div>

            <!-- Selected files preview -->
            <div v-if="selectedCount > 0" class="selected-files-preview">
                <div class="selected-summary">{{ selectedCount }} file{{ selectedCount > 1 ? 's' : '' }} selected</div>
                <ul class="selected-list">
                    <li v-for="(f, i) in selectedFiles" :key="i" class="selected-item" :title="f.name">
                        <span class="name">{{ f.name }}</span>
                        <span class="size">{{ formatBytes(f.size) }}</span>
                    </li>
                </ul>
            </div>

            <div class="ds-file-queues">
                <section class="ds-file-queue outgoing">
                    <h3>Outgoing</h3>
                    <div v-if="outgoingFiles.length === 0" class="empty">No outgoing files</div>
                    <div v-for="file in outgoingFiles" :key="file.name" class="file-card">
                        <div class="file-meta">
                            <div class="file-icon">📤</div>
                            <div class="file-info">
                                <div class="file-name">{{ file.name }}</div>
                                <div class="file-size">{{ formatBytes(file.size) }}</div>
                            </div>
                        </div>
                        <progress class="file-progress" max="100" value="100"></progress>
                    </div>
                </section>

                <section class="ds-file-queue incoming">
                    <h3>Receiving</h3>
                    <div v-if="incomingFiles.length === 0" class="empty">No incoming files</div>
                    <div v-for="file in incomingFiles" :key="file.name" class="file-card">
                        <div class="file-meta">
                            <div class="file-icon">📥</div>
                            <div class="file-info">
                                <div class="file-name">{{ file.name }}</div>
                                <div class="file-size">{{ formatBytes(file.size) }}</div>
                            </div>
                        </div>
                        <progress class="file-progress" max="100" value="0"></progress>
                    </div>
                </section>
            </div>
        </main>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, computed, inject } from 'vue';
import { useRouter } from 'vue-router';
import clientSocket from '../socket';

interface ILobbyInfo {
    lobbyId: string;
    lobbyName: string;
    lobbyOwnerId?: string;
    lobbyMembers: { memberId: string; memberName: string }[];
    lobbyStatus: 'ready' | 'not-ready';
}

interface IIncomingRecord {
    id: string;
    name: string;
    size: number;
    mime?: string;
    chunks: BlobPart[];
    receivedBytes: number;
    done: boolean;
}

const lobby = ref<ILobbyInfo>({
    lobbyId: '',
    lobbyName: 'Default Lobby',
    lobbyOwnerId: '',
    lobbyStatus: 'not-ready',
    lobbyMembers: []
});

const lobbyStatus = computed(() =>
    lobby.value.lobbyStatus === 'ready' ? 'Ready to send files' : 'Waiting for members'
);

function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${i === 0 ? Math.round(value) : value.toFixed(2)} ${sizes[i]}`;
}

const router = useRouter();
const userId = (inject<string>('userId') as string | undefined) ?? '';
const lobbyId = router.currentRoute.value.params.id as string | undefined;

let peerConnection: RTCPeerConnection | null = null;
let dataChannel: RTCDataChannel | null = null;

const fileInput = ref<HTMLInputElement | null>(null);
const outgoingFiles = ref<File[]>([]);

// incomingFiles shown in UI (metadata + progress)
const incomingFiles = ref<IIncomingRecord[]>([]);

// for preview selection
const selectedFiles = ref<File[]>([]);
const selectedCount = computed(() => selectedFiles.value.length);

const copied = ref(false);

async function copyLobbyId() {
    const id = lobby.value.lobbyId;
    if (!id) return;
    try {
        await navigator.clipboard.writeText(id);
        copied.value = true;
        setTimeout(() => (copied.value = false), 1800);
    } catch (err) {
        console.warn('Clipboard write failed', err);
    }
}

function handleFileChange() {
    selectedFiles.value = fileInput.value?.files ? Array.from(fileInput.value.files) : [];
}

function leaveLobby() {
    router.push({ name: 'home' });
}

function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const MAX_BUFFERED_AMOUNT = 2_000_000;
const CHUNK_SIZE = 64 * 1024; // 64KB - reasonable default

function waitForBufferDrain(channel: RTCDataChannel, max = MAX_BUFFERED_AMOUNT) {
    return new Promise<void>(resolve => {
        if (channel.bufferedAmount < max) return resolve();
        const handler = () => {
            if (channel.bufferedAmount < max) {
                channel.removeEventListener('bufferedamountlow', handler);
                resolve();
            }
        };
        channel.bufferedAmountLowThreshold = Math.floor(max / 2);
        channel.addEventListener('bufferedamountlow', handler);
    });
}

async function sendFileChunks(file: File, channel: RTCDataChannel) {
    const id = generateId();
    const metadata = { type: 'meta', id, name: file.name, size: file.size, mime: file.type };
    channel.send(JSON.stringify(metadata));

    let offset = 0;
    while (offset < file.size) {
        const chunk = file.slice(offset, offset + CHUNK_SIZE);
        const buffer = await chunk.arrayBuffer();
        await waitForBufferDrain(channel);
        channel.send(buffer);
        offset += buffer.byteLength;
    }

    channel.send(JSON.stringify({ type: 'done', id, name: file.name }));
}

async function sendFiles() {
    if (!dataChannel || dataChannel.readyState !== 'open') {
        console.error('Data channel is not open');
        return;
    }
    const files = selectedFiles.value;
    if (!files || files.length === 0) {
        console.warn('No file selected');
        return;
    }
    for (const f of files) {
        outgoingFiles.value.push(f);
        try {
            await sendFileChunks(f, dataChannel);
        } catch (err) {
            console.error('Failed to send file', f.name, err);
        }
    }
    selectedFiles.value = [];
    if (fileInput.value) fileInput.value.value = '';
}

// Manage incoming transfers keyed by id
const incomingMap = new Map<string, IIncomingRecord>();

function finalizeIncoming(id: string) {
    const rec = incomingMap.get(id);
    if (!rec) return;
    const blob = new Blob(rec.chunks);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = rec.name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
    // mark done in UI
    rec.done = true;
    incomingMap.delete(id);
}

// Socket handlers (named so we can off them later)
function onLobbyStatusChanged(data: { lobby: ILobbyInfo }) {
    Object.assign(lobby.value, data.lobby);
}
function onLobbyJoined(data: { lobbyId: string; userId: string }) {
    if (lobby.value.lobbyId === data.lobbyId && lobby.value.lobbyStatus === 'ready' && data.userId === userId) {
        createOffer();
    }
}
async function onIncomingOffer(payload: { offer: RTCSessionDescriptionInit }) {
    if (payload.offer) {
        await peerConnection?.setRemoteDescription(payload.offer);
        createAnswer();
    }
}
async function onIncomingAnswer(payload: { answer: RTCSessionDescriptionInit }) {
    if (payload.answer) {
        await peerConnection?.setRemoteDescription(payload.answer);
    }
}
async function onIceCandidate(payload: { candidate: RTCIceCandidateInit }) {
    if (payload.candidate) {
        await peerConnection?.addIceCandidate(payload.candidate);
    }
}
function onLobbyDeleted() {
    leaveLobby();
}

async function createOffer() {
    if (!peerConnection) return;
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    clientSocket.emit('sendOffer', { offer, lobbyId, userId });
}

async function createAnswer() {
    if (!peerConnection) return;
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    clientSocket.emit('sendAnswer', { answer, lobbyId, userId });
}

onMounted(() => {
    if (!userId || !lobbyId) return;

    peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            clientSocket.emit('sendIceCandidate', { candidate: event.candidate, lobbyId, userId });
        }
    };

    // If this client initiates connection, create a data channel and attach handlers
    dataChannel = peerConnection.createDataChannel('fileTransfer');
    dataChannel.binaryType = 'arraybuffer';
    dataChannel.onopen = () => console.log('data channel open');
    dataChannel.onclose = () => console.log('data channel closed');
    dataChannel.onerror = (ev) => console.error('data channel error', ev);
    dataChannel.onmessage = (ev) => {
        // Messages on the initiator's data channel (for symmetry)
        if (typeof ev.data === 'string') {
            try {
                const m = JSON.parse(ev.data);
                if (m.type === 'meta') {
                    const rec: IIncomingRecord = { id: m.id, name: m.name, size: m.size, mime: m.mime, chunks: [], receivedBytes: 0, done: false };
                    incomingMap.set(m.id, rec);
                    incomingFiles.value.push(rec);
                } else if (m.type === 'done') {
                    finalizeIncoming(m.id);
                }
            } catch (err) {
                console.warn('Failed parsing text message', err);
            }
        } else if (ev.data instanceof ArrayBuffer || ev.data instanceof Blob) {
            // binary chunk; we need an active transfer. We assume sender preceded chunks with meta (with id)
            // Find last active transfer (simple heuristic) — using id is better when sender supports concurrent streams.
            const buffer = ev.data instanceof Blob ? ev.data : new Blob([ev.data]);
            // Try to find the most recent incomplete transfer
            const rec = Array.from(incomingMap.values()).find(r => !r.done);
            if (rec) {
                rec.chunks.push(buffer);
                rec.receivedBytes += (buffer as Blob).size;
            } else {
                console.warn('Received binary chunk but no active transfer record');
            }
        }
    };

    // Also listen for remote-created data channels (when this client is answerer)
    peerConnection.ondatachannel = (event) => {
        const receiveChannel = event.channel;
        receiveChannel.binaryType = 'arraybuffer';
        receiveChannel.onmessage = (ev) => {
            if (typeof ev.data === 'string') {
                try {
                    const m = JSON.parse(ev.data);
                    if (m.type === 'meta') {
                        const rec: IIncomingRecord = { id: m.id, name: m.name, size: m.size, mime: m.mime, chunks: [], receivedBytes: 0, done: false };
                        incomingMap.set(m.id, rec);
                        incomingFiles.value.push(rec);
                    } else if (m.type === 'done') {
                        finalizeIncoming(m.id);
                    }
                } catch (err) {
                    console.warn('Failed parsing text message', err);
                }
            } else if (ev.data instanceof ArrayBuffer || ev.data instanceof Blob) {
                const buffer = ev.data instanceof Blob ? ev.data : new Blob([ev.data]);
                const rec = Array.from(incomingMap.values()).find(r => !r.done);
                if (rec) {
                    rec.chunks.push(buffer);
                    rec.receivedBytes += (buffer as Blob).size;
                } else {
                    console.warn('Received binary chunk but no active transfer record');
                }
            }
        };
        receiveChannel.onopen = () => console.log('receiveChannel open');
        receiveChannel.onclose = () => console.log('receiveChannel closed');
    };

    // register socket handlers
    clientSocket.on('lobbyStatusChanged', onLobbyStatusChanged);
    clientSocket.on('lobbyJoined', onLobbyJoined);
    clientSocket.on('incomingOffer', onIncomingOffer);
    clientSocket.on('incomingAnswer', onIncomingAnswer);
    clientSocket.on('iceCandidate', onIceCandidate);
    clientSocket.on('lobbyDeleted', onLobbyDeleted);

    clientSocket.emit('joinLobby', { lobbyId, userId });
});

onBeforeUnmount(() => {
    clientSocket.emit('leaveLobby', { lobbyId, userId });

    clientSocket.off('lobbyStatusChanged', onLobbyStatusChanged);
    clientSocket.off('lobbyJoined', onLobbyJoined);
    clientSocket.off('incomingOffer', onIncomingOffer);
    clientSocket.off('incomingAnswer', onIncomingAnswer);
    clientSocket.off('iceCandidate', onIceCandidate);
    clientSocket.off('lobbyDeleted', onLobbyDeleted);

    dataChannel?.close();
    peerConnection?.close();
    peerConnection = null;
    dataChannel = null;
});
</script>

<style scoped>
/* New responsive and polished UI styles */

.ds-lobby-container {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 20px;
    align-items: start;
    padding: 18px;
    box-sizing: border-box;
    width: 100%;
    min-height: 70vh;
    background: linear-gradient(180deg, #f7fbff 0%, #ffffff 100%);
    border-radius: 12px;
    box-shadow: 0 6px 18px rgba(20,30,50,0.06);
}

/* Left panel */
.ds-lobby-left-panel {
    background: #fff;
    padding: 18px;
    border-radius: 10px;
    border: 1px solid rgba(15,20,40,0.04);
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
}

.ds-lobby-header {
    display: flex;
    flex-direction: column;
}

.ds-lobby-name {
    margin: 0;
    font-size: 1.25rem;
    color: #0f1724;
    font-weight: 600;
}

.ds-lobby-sub {
    margin: 2px 0 0;
    color: #5b6b78;
    font-size: 0.85rem;
}

.ds-lobby-status {
    margin-top: 6px;
}

.status-badge {
    display: inline-block;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 0.85rem;
    font-weight: 600;
    color: white;
}

.status-badge.ready { background: linear-gradient(90deg, #059669, #10b981); }
.status-badge.not-ready { background: linear-gradient(90deg, #ef4444, #f97316); }

/* members */
.ds-lobby-members h4 {
    margin: 0 0 8px 0;
    font-size: 0.95rem;
    color: #263238;
}
.ds-lobby-members ul {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0;
    margin: 0;
}
.member-item {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #fbfdff;
    padding: 8px;
    border-radius: 8px;
    border: 1px solid rgba(15,20,40,0.03);
}
.avatar {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg,#4f46e5,#06b6d4);
    color: white;
    border-radius: 50%;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:700;
}
.member-name { font-weight:600; color:#0f1724; }
.member-id { font-size:0.75rem; color:#7b8a93; }

/* Right panel */
.ds-lobby-right-panel {
    display:flex;
    flex-direction: column;
    gap: 16px;
}

/* Actions */
.ds-actions-top {
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:12px;
    background: #fff;
    padding: 12px;
    border-radius: 10px;
    border: 1px solid rgba(15,20,40,0.04);
}

.file-input-label { display:inline-flex; align-items:center; gap:8px; cursor:pointer; }
.file-input { display:none; }

.action-buttons { display:flex; gap:8px; }

/* Button styles */
.btn {
    border: none;
    padding: 8px 14px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    background: #eef2ff;
    color: #3730a3;
    transition: transform .06s ease, box-shadow .06s ease;
}
.btn:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(16,24,40,.06); }
.btn.primary { background: linear-gradient(90deg,#4f46e5,#06b6d4); color: #fff; }
.btn.ghost { background: transparent; color:#374151; border:1px solid rgba(15,20,40,0.06); }

/* Tiny button for copy action */
.btn.tiny {
    padding: 6px 8px;
    font-size: 0.8rem;
    border-radius: 6px;
    background: #eef2ff;
    color: #3730a3;
    margin-left: 8px;
    border: none;
    cursor: pointer;
}
.btn.tiny:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(16,24,40,.04); }

/* Visual tweak for ID span */
.ds-lobby-sub .id {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace;
    background: rgba(15,20,40,0.03);
    padding: 4px 8px;
    border-radius: 6px;
    margin-left: 6px;
}

/* File queues */
.ds-file-queues {
    display:grid;
    grid-template-columns: 1fr 1fr;
    gap:12px;
}

.ds-file-queue {
    background:#fff;
    padding:12px;
    border-radius:10px;
    border:1px solid rgba(15,20,40,0.04);
    min-height:160px;
}

.ds-file-queue h3 { margin:0 0 8px 0; font-size:1rem; color:#102a43; }
.empty { color:#7b8a93; font-size:0.9rem; padding:8px 0; }

/* File card */
.file-card {
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    padding:8px;
    margin:8px 0;
    border-radius:8px;
    background: linear-gradient(180deg,#fbfdff,#ffffff);
    border:1px solid rgba(15,20,40,0.03);
}
.file-meta { display:flex; align-items:center; gap:10px; }
.file-icon { font-size:20px; }
.file-info { display:flex; flex-direction:column; }
.file-name { font-weight:600; color:#0f1724; }
.file-size { font-size:0.85rem; color:#6b7280; }
.file-progress { width: 160px; height: 8px; border-radius: 8px; overflow: hidden; }

/* Responsive adjustments */
@media (max-width: 880px) {
    .ds-lobby-container { grid-template-columns: 1fr; padding:12px; }
    .ds-file-queues { grid-template-columns: 1fr; }
    .ds-actions-top { flex-direction: column; align-items: stretch; gap:8px; }
    .ds-lobby-left-panel { order: 1; }
    .ds-lobby-right-panel { order: 2; }
}

@media (max-width: 420px) {
    .ds-lobby-container { padding:10px; }
    .ds-lobby-name { font-size:1.05rem; }
    .avatar { width:32px; height:32px; font-size:0.95rem; }
}
</style>