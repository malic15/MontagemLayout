using System.Speech.Synthesis;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.IO;
using System.Speech.Synthesis;
using System.Threading.Tasks;
using System;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Threading.Channels;
using System.Text.Json;

namespace MontagemLayout.Services
{
    public class AudioCache
    {
        private readonly Dictionary<string, string> _cache = new Dictionary<string, string>();
        private readonly string _cacheDirectory = "wwwroot/cache/audio";
        private readonly IHubContext<AudioHub> _audioHub;
        private readonly Channel<string> _audioMessageChannel = Channel.CreateUnbounded<string>();

        public AudioCache(IHubContext<AudioHub> audioHubContext)
        {
            _audioHub = audioHubContext;
            _ = ProcessAudioQueue();
        }
        public async Task SendAudioMessage(string message)
        {
            await _audioMessageChannel.Writer.WriteAsync(message);

            //string audioPath = GetOrAddAudio(message, GenerateAudio);

            //string audioUrl = $"/cache/audio/{Path.GetFileName(audioPath)}";
            
            //await _audioHub.Clients.All.SendAsync("ReceiveAudio", audioUrl);
        }
        private async Task ProcessAudioQueue()
        {
            await foreach (var message in _audioMessageChannel.Reader.ReadAllAsync())
            {
                try
                {
                    string audioPath = GetOrAddAudio(message, GenerateAudio);
                    string audioUrl = $"/cache/audio/{Path.GetFileName(audioPath)}";
                    await _audioHub.Clients.All.SendAsync("ReceiveAudio", audioUrl);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Erro ao processar áudio: {ex.Message}");
                }
            }
        }

        private string GenerateAudio(string message)
        {
            string audioPath = Path.Combine("wwwroot","cache","audio", $"{Guid.NewGuid()}.wav");

            using (var synthesizer = new SpeechSynthesizer())
            {
                foreach (var voice in synthesizer.GetInstalledVoices())
                {
                    var info = voice.VoiceInfo;
                    Console.WriteLine($"Voice: {info.Name}, Culture: {info.Culture}, Age: {info.Age}, Gender: {info.Gender}");
                }
                synthesizer.SelectVoiceByHints(VoiceGender.Female, VoiceAge.Adult, 0, new System.Globalization.CultureInfo("pt-BR"));
                synthesizer.Volume = 100;
                synthesizer.Rate = 1;
                synthesizer.SetOutputToWaveFile(audioPath);                
                synthesizer.Speak(message);
            }
            Console.WriteLine(audioPath);

            return audioPath;
        }
        private string GetOrAddAudio(string message, Func<string, string> generateAudio)
        {
            if (_cache.TryGetValue(message, out string audioPath))
            {
                return audioPath;
            }

            audioPath = generateAudio(message);
            _cache[message] = audioPath;
            return audioPath;
        }
        public void ClearCache()
        {
            foreach (var file in Directory.GetFiles(_cacheDirectory))
            {
                File.Delete(file);
            }
            _cache.Clear();
        }
    }
}