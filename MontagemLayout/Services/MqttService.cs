using MQTTnet;
using MQTTnet.Client;
using MQTTnet.Client.Options;
using System;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;
using System.Threading.Channels;

namespace MontagemLayout.Services
{
    public class MqttService
    {
        private readonly IMqttClient _mqttClient;
        private readonly IMqttClientOptions _options;
        private readonly IHubContext<MqttHub> _hubMqttContext;
        private readonly ConcurrentQueue<string> _messageQueue = new ConcurrentQueue<string>();
        private readonly Channel<string> _messageChannel = Channel.CreateUnbounded<string>();
        private static readonly object lockObject = new object();
        private readonly Dictionary<string, DateTime> lastCallByFunction = new();
        private readonly Dictionary<string, TimeSpan> coolDownByFunction = new();
        public event Func<string, Task> OnMqttMessageReceived;
        //private static int countPortas = 0;

        public MqttService(IHubContext<MqttHub> hubContext)
        {
            _hubMqttContext = hubContext;

            string randomNumber = GenerateRandomNumber(9);

            var factory = new MqttFactory();
            _mqttClient = factory.CreateMqttClient();

            _options = new MqttClientOptionsBuilder()
                .WithClientId("aspnet_client" + randomNumber)
                .WithTcpServer("172.29.151.26", 1883)
                .WithCleanSession()
                .WithReceiveMaximum(1000)
                .Build();

            _mqttClient.UseConnectedHandler(async e =>
            {
                Console.WriteLine("Connected to MQTT broker");

                var topics = new List<MqttTopicFilter>
                {
                    new MqttTopicFilterBuilder().WithTopic("chassis5/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("chassis4/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("chassis3/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("chassis2/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("chassis1/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("final1/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("final2/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("trim0/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("trim1/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("trim2/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("portas/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("deckingup/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("deckingdown/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("pb1/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("pb2/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("glazing/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("umc/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("goma/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("gomaope170/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("gomaope180/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("gomaope190/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("gomaope200/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                    new MqttTopicFilterBuilder().WithTopic("falhamarriage/topic").WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.ExactlyOnce).Build(),
                };
                await _mqttClient.SubscribeAsync(topics.ToArray());
            });
            _mqttClient.UseDisconnectedHandler(async e =>
            {
                Console.WriteLine("Disconnected from MQTT broker");
                var retryInterval = 5;
                int retries = 0;

                while (!_mqttClient.IsConnected && retries < 10)
                {
                    try
                    {
                        Console.WriteLine($"Attempting to reconnect in {retryInterval} seconds...");
                        await Task.Delay(TimeSpan.FromSeconds(retryInterval));
                        await _mqttClient.ConnectAsync(_options, CancellationToken.None);
                        retryInterval = 1;
                        retries = 0;
                    }
                    catch
                    {
                        Console.WriteLine("Reconnect failed, retrying...");
                        retryInterval = Math.Min(retryInterval * 2, 60);
                        retries++;
                    }
                }
                if (retries >= 10)
                {
                    Console.WriteLine("Failed to reconnect after 10 attempts.");
                }
            });
            _mqttClient.UseApplicationMessageReceivedHandler(e =>
            {
                var payload = Encoding.Latin1.GetString(e.ApplicationMessage.Payload);
                _messageChannel.Writer.TryWrite(payload);
            });
        }
        
        private void StartMessageProcessor()
        {
            //int countPortas = 0;
        _ = Task.Run(async () =>
            {
                await foreach (var message in _messageChannel.Reader.ReadAllAsync())
                {
                    try
                    {
                        
                        if (OnMqttMessageReceived != null)
                        {
                            //var json = JsonDocument.Parse(message);
                            //var line = json.RootElement.GetProperty("line");
                            //var db = json.RootElement.GetProperty("db");
                            //var mqttData = json.RootElement.GetProperty("data").EnumerateArray()
                            //                .Select(x => x.GetInt32())
                            //                .ToArray();
                            await OnMqttMessageReceived.Invoke(message);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error processing message: {ex.Message}");
                    }
                }
            });
        }
        public async Task StartAsync()
        {
            try
            {
                await _mqttClient.ConnectAsync(_options, CancellationToken.None);
                StartMessageProcessor();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Connection failed: {ex.Message}");
            }
        }

        public async Task StopAsync()
        {
            _messageChannel.Writer.Complete();
            await _mqttClient.DisconnectAsync();
        }
        public async Task ProcessMqttMessage(string message)
        {
            await _hubMqttContext.Clients.All.SendAsync("ReceiveMqttVariable", message);
        }
        public async Task MessageAlert(string message)
        {
            await _hubMqttContext.Clients.All.SendAsync("ReceiveMessage", message);            
        }
        public async Task BufferMonitoring(string buffer)
        {
            await _hubMqttContext.Clients.All.SendAsync("ReceiveBuffer", buffer);
        }
        public async Task PDTMonitoring(string buffer)
        {
            await _hubMqttContext.Clients.All.SendAsync("PDTMonitoring", buffer);
        }
        static string GenerateRandomNumber(int length)
        {
            Random random = new Random();
            string result = "";

            for (int i = 0; i < length; i++)
            {
                int digit = random.Next(0, 10);
                result += digit.ToString();
            }
            return result;
        }
    }
}