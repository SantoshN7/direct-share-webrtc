<script setup lang="ts">
import { inject, ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router'

const router = useRouter();
const createLobbyDialog = ref<HTMLDialogElement | null>(null);
const joinLobbyDialog = ref<HTMLDialogElement | null>(null);
const errorMessage = ref<string>('');
const userId = inject<string>('userId');
const formData = ref({
  userName: '',
  lobbyCode: '',
});
// Functions to handle creating and joining lobbies
function createLobby() {
  // Logic to create a lobby
  axios.post('http://localhost:3000/api/createLobby', {
    userName: formData.value.userName,
    userId: userId,
  })
  .then((response) => {
    console.log(response.data);
    createLobbyDialog.value?.close();
    router.push({
      path: `/lobby/${response.data.lobbyId}`,
    });
  })
  .catch((error) => {
    errorMessage.value = `Failed to create lobby. ${error.response?.data?.error || error.message}`;
  }).finally(() => {
    formData.value.userName = ''; // Reset the form data
  });
}

function joinLobby() {
  // Logic to join a lobby
  axios.post('http://localhost:3000/api/joinLobby', {
    userName: formData.value.userName,
    userId: userId,
    lobbyId: formData.value.lobbyCode,
  })
  .then((response) => {
    joinLobbyDialog.value?.close();
    router.push({
      path: `/lobby/${formData.value.lobbyCode}`,
    });
  })
  .catch((error) => {
    console.log(error)
    errorMessage.value = `Failed to join lobby. ${error.response?.data?.error || error.message}`;
    console.error('Error joining lobby:', error);
  }).finally(() => {
    formData.value.userName = '';
    formData.value.lobbyCode = '';
  });
}

function openCreateLobbyDialog() {
  errorMessage.value = ''; // Reset error message
  createLobbyDialog.value?.showModal();
}

function openJoinLobbyDialog() {
  errorMessage.value = ''; // Reset error message
  joinLobbyDialog.value?.showModal();
}

</script>

<template>
  <div class="ds-actions-container">
    <ul class="ds-actions-list">
      <li class="ds-action-item">
        <button type="button" @click="createLobbyDialog?.showModal()">Create lobby</button>
      </li>
      <li class="ds-action-item">
        <button type="button" @click="joinLobbyDialog?.showModal()">Join lobby</button>
      </li>
    </ul>
    <!-- Dialog for create lobby -->
    <dialog ref="createLobbyDialog" class="ds-lobby-dialog">
      <h2>Create Lobby</h2>
      <form @submit.prevent="createLobby()">
        <div>
          <label for="userName">User Name:</label>
          <input v-model="formData.userName" type="text" name="userName" required />
        </div>
        <div>
          <button type="submit">Create</button>
          <button type="button" @click="createLobbyDialog?.close()">Cancel</button>
        </div>
      </form>
      <p v-if="errorMessage" style="color: red;">{{ errorMessage }}</p>
    </dialog>
    <!-- Dialog for joining a lobby -->
    <dialog ref="joinLobbyDialog" class="ds-lobby-dialog">
      <h2>Join Lobby</h2>
      <form @submit.prevent="joinLobby()">
        <div>
          <label for="userName">User Name:</label>
          <input v-model="formData.userName" type="text" name="userName" required />
        </div>
        <div>
          <label for="lobbyCode">Lobby Code:</label>
          <input v-model="formData.lobbyCode" type="text" name="lobbyCode" required />
        </div>
        <div>
          <button type="submit">Join</button>
          <button type="button" @click="joinLobbyDialog?.close()">Cancel</button>
        </div>
      </form>
      <p v-if="errorMessage" style="color: red;">{{ errorMessage }}</p>
    </dialog>
  </div>
</template>

<style scoped>
.ds-actions-container {
  display: flex;
  justify-content: center;
  padding: 20px;
}
.ds-actions-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  gap: 20px;
}
.ds-action-item {
  display: flex;
  align-items: center;
}
.ds-action-item button {
  padding: 10px 20px;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  border-radius: 5px;
  background-color: #007bff;
  color: white;
  transition: background-color 0.3s ease;
}
.ds-action-item button:hover {
  background-color: #0056b3;
}
.ds-action-item button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.5);
}

.ds-lobby-dialog {
  padding: 10px;
  border: none;
  border-radius: 10px;
  background-color: #f9f9f9;
}
.ds-lobby-dialog h2 {
  margin-top: 0;
}
.ds-lobby-dialog form {
  display: flex;
  flex-direction: column;
}
.ds-lobby-dialog form div {
  margin-bottom: 15px;
}
.ds-lobby-dialog form label {
  margin-bottom: 5px;
  font-weight: bold;
}
.ds-lobby-dialog form input {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  width: 90%;
}
.ds-lobby-dialog form button {
  margin-right: 10px;
  padding: 10px 20px;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  border-radius: 5px;
  color: white;
  transition: background-color 0.3s ease;
}
.ds-lobby-dialog form button[type="submit"] {
  background-color: #28a745;
}
.ds-lobby-dialog form button[type="submit"]:hover {
  background-color: #218838;
}
.ds-lobby-dialog form button[type="button"] {
  background-color: #686868;
}
.ds-lobby-dialog form button[type="button"]:hover {
  background-color: #565656;
}
</style>
