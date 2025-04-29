using Microsoft.AspNetCore.SignalR;

namespace MontagemLayout.Services
{
    public class AudioHub : Hub
    {
        public async Task SendAudio(byte[] audioBytes)
        {
            await Clients.All.SendAsync("ReceiveAudio", audioBytes);
        }
    }
}
