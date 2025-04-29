using Microsoft.AspNetCore.SignalR;

namespace MontagemLayout.Services
{
    public class DataHub : Hub
    {
        public async Task SendApplicationState(Dictionary<string, Dictionary<int, int>> appState)
        {
            await Clients.All.SendAsync("ReceiveApplicationState", appState);
        }
    }
}