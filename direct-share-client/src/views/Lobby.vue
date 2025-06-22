<script setup lang="ts">
</script>

<template>
    <div class="ds-lobby-container">
        <div class="ds-lobby-left-panel">
            <h2 class="ds-lobby-name">{{ 'lobby name' }}</h2>
            <div class="ds-lobby-status">
                <p>{{ lobbyStatus }}</p>
            </div>
            <div class="ds-lobby-members" v-if="members.length > 0">
                <p>Members:</p>
                <ul>
                    <li v-for="user in members" :key="user.id">{{ user.name }}</li>
                </ul>
            </div>

        </div>
        <div class="ds-lobby-right-panel">
            <div class="ds-lobby-actions">
                <button @click="sendFiles">Send Files</button>
                <button @click="leaveLobby">Leave</button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';

const members = ref([]);
const lobbyStatus = ref('Waiting for members...');

function leaveLobby() {
    // Logic to leave the lobby
    console.log('Leaving lobby...');
}

function sendFiles() {
    // Logic to send files
    console.log('Sending files...');
}
</script>

<style scoped>
.ds-lobby-container {
    display: flex;
    flex: 1;
    height: 80vh;
}               
.ds-lobby-left-panel {
    display: flex;
    flex-direction: column;
    width: 20%;
    margin-right: 20px;
    border-right: 2px solid #ccc;
    align-items: center;
}

.ds-lobby-right-panel {
    display: flex;
    flex: 1;
    flex-direction: row;
    justify-content: center;
}
.ds-lobby-actions {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
}
.ds-lobby-actions button {
    margin: 10px;
    padding: 10px;
    font-size: 1em;
    cursor: pointer;
}
.ds-lobby-actions button:hover {
    background-color: #007bff;
    color: white;
}
.ds-lobby-name {
    font-size: 1.5em;
    margin-bottom: 10px;
}
.ds-lobby-status {
    margin-bottom: 20px;
}
.ds-lobby-members {
    margin-bottom: 20px;
}
.ds-lobby-members ul {
    list-style: none;
    padding: 0;
}
.ds-lobby-members li {
    margin: 5px 0;
}


</style>