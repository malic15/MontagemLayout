// URL do WebSocket - ajuste conforme necessário
const wsUrl = 'ws://172.29.151.26:29053/ws';

// Cria uma nova conexão WebSocket
const socket = new WebSocket(wsUrl);

// Função chamada quando a conexão WebSocket é aberta
socket.onopen = () => {
    console.log('WebSocket connection established.');
};

// Função chamada quando uma mensagem é recebida do servidor
socket.onmessage = (event) => {
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(event.data)) {
        const dateTimeElement = document.getElementById('currentDateTime');
        if (dateTimeElement) {
            dateTimeElement.textContent = `Data e Hora: ${event.data}`;
        }
    } else {
        const messageContainer = document.getElementById('messages');
        const newMessage = document.createElement('p');
        newMessage.textContent = `Mensagem recebida: ${event.data}`;
        messageContainer.appendChild(newMessage);
    }
};

// Função chamada quando a conexão WebSocket é fechada
socket.onclose = () => {
    console.log('WebSocket connection closed.');
};

// Função chamada em caso de erro na conexão WebSocket
socket.onerror = (error) => {
    console.error('WebSocket error:', error);
};