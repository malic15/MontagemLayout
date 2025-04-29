using Microsoft.AspNetCore.SignalR;

namespace MontagemLayout.Services
{
    public class MqttHub : Hub
    {
        public async Task SendMessageToClients(int desiredVariable)
        {
            await Clients.All.SendAsync("ReceiveMqttVariable", desiredVariable);
        }
        
    }

}
