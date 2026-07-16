<script>
  import AskAiButton from '$lib/components/sections/AskAIButton.svelte';
  import ChatModal from '$lib/components/modals/ChatModal.svelte';

  let showChat = false;

  function handleOpenChat() {
    showChat = true;
  }

  function handleCloseChat() {
    showChat = false;
  }
</script>

<div class="">
  <AskAiButton onopenChat={handleOpenChat} />
  <ChatModal isOpen={showChat} onClose={handleCloseChat} />
</div>
