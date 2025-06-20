<script setup lang="ts">
import {ref, readonly, provide} from 'vue';
import { RouterLink, RouterView } from 'vue-router'
import { nanoid } from 'nanoid';

const userId = nanoid(10);
provide('userId', readonly(ref(userId)));

</script>

<template>
  <div class="ds-header-container">
    <h2 class="ds-header-text"><RouterLink to="/">Direct share</RouterLink></h2>
    <div class="ds-header-description">
      <span>Share files directly</span>
    </div>
  </div>
  <RouterView />
</template>

<style scoped>
.ds-header-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #ccc;
  background-color: #f9f9f9;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  text-align: center;
  width: 100%;
  box-sizing: border-box;
  z-index: 1000;
  font-family: Arial, sans-serif;
  color: #333;
}
.ds-header-text {
  font-size: 2rem;
  margin: 0;
}
.ds-header-description {
  font-size: 1rem;
  color: #666;
  font-style: italic;
}
.ds-header-text a {
  text-decoration: none;
  color: inherit;
}
.ds-header-text a:hover {
  text-decoration: underline;
}
</style>
