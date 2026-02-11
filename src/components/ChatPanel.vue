<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { useGameStore } from '../stores/gameStore';

const emit = defineEmits<{ close: [] }>();
const game = useGameStore();

const newMessage = ref('');
const messagesRef = ref<HTMLDivElement | null>(null);

onMounted(() => {
  game.refreshChat();
  scrollBottom();
});

watch(() => game.chatMessages.length, () => nextTick(scrollBottom));

function scrollBottom() {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
  }
}

async function send() {
  const txt = newMessage.value.trim();
  if (!txt) return;
  newMessage.value = '';
  await game.sendMessage(txt);
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <div class="chat-panel">
    <div class="chat-header">
      <h3>Chat</h3>
      <button class="close-btn" @click="emit('close')">✕</button>
    </div>

    <div ref="messagesRef" class="messages">
      <div
        v-for="msg in game.chatMessages"
        :key="msg.id"
        class="message"
        :class="{ mine: msg.senderId === game.currentPlayer?.id }"
      >
        <div class="msg-header">
          <span class="sender">{{ msg.senderName }}</span>
          <span class="time">{{ formatTime(msg.timestamp) }}</span>
        </div>
        <p class="msg-content">{{ msg.content }}</p>
      </div>
      <div v-if="game.chatMessages.length === 0" class="no-messages">
        Aucun message. Dites bonjour !
      </div>
    </div>

    <form class="chat-input" @submit.prevent="send">
      <input v-model="newMessage" placeholder="Message..." />
      <button type="submit" class="btn-primary">↵</button>
    </form>
  </div>
</template>

<style scoped>
.chat-panel {
  position: fixed;
  bottom: 4em;
  right: 1em;
  width: 320px;
  height: 400px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  z-index: 101;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6em 1em;
  border-bottom: 1px solid var(--border);
}

.chat-header h3 {
  font-size: 0.9em;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1em;
  padding: 0;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.5em;
}

.message {
  margin-bottom: 0.5em;
  padding: 0.4em 0.6em;
  border-radius: 4px;
  background: var(--bg-secondary);
}

.message.mine {
  background: rgba(212, 165, 90, 0.1);
  border-left: 2px solid var(--accent);
}

.msg-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.75em;
  margin-bottom: 0.2em;
}

.sender {
  font-weight: 600;
  color: var(--accent);
}

.time {
  color: var(--text-secondary);
}

.msg-content {
  font-size: 0.85em;
  margin: 0;
}

.no-messages {
  text-align: center;
  color: var(--text-secondary);
  padding: 2em;
  font-size: 0.85em;
}

.chat-input {
  display: flex;
  gap: 0.3em;
  padding: 0.5em;
  border-top: 1px solid var(--border);
}

.chat-input input {
  flex: 1;
}

.chat-input button {
  padding: 0.4em 0.8em;
}
</style>
