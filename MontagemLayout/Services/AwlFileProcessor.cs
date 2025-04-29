using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Xml.Linq;

namespace MontagemLayout.Services
{
    public class AwlFileProcessor
    {
        public IActionResult GetAwlMessagesFromPayload(string filePath, string payloadJson)
        {

            if (!File.Exists(filePath))
            {
                //Console.WriteLine("File not found.");
                return new NotFoundResult();
            }

            var allMessages = ExtractAwlMessage(filePath);

            var payload = JsonDocument.Parse(payloadJson);
            var data = payload.RootElement.GetProperty("data").EnumerateArray()
                            .Select(x => x.GetInt32())
                            .ToArray();
            var activeMessages = GetActiveMessages(allMessages, data);
            return new ObjectResult(activeMessages);            
        }
        private static System.Collections.Generic.List<(string Message, string Priority, string Zone, string Element)> GetActiveMessages((string Message, string Priority, string Zone, string Element)[] allMessages, int[] data)
        {
            var activeMessages = new System.Collections.Generic.List<(string Message, string Priority, string Zone, string Element)>();
            for (int i = 0; i < data.Length; i++)
            {
                int value = data[i];
                for (int bitPosition = 0; bitPosition < 8; bitPosition++)
                {
                    if ((value & (1 << bitPosition)) != 0)
                    {
                        int messageIndex = (i * 8) + bitPosition;

                        if (messageIndex < allMessages.Length)
                        {
                            activeMessages.Add(allMessages[messageIndex]);
                        }
                    }
                }
            }
            return activeMessages;
        }
        private static (string Message, string Priority, string Zone, string Element)[] ExtractAwlMessage(string filePath)
        {
            var lines = File.ReadAllLines(filePath, System.Text.Encoding.Latin1);
            int startIndex = Array.FindIndex(lines, line => line.Contains("EVENTS : STRUCT") || line.Contains("EVENT : STRUCT"));
            int endIndex = Array.FindIndex(lines, line => line.Contains("END_STRUCT"));

            if (startIndex == -1 || endIndex == -1 || startIndex >= endIndex)
            {
                return Array.Empty<(string Message, string Priority, string Zone, string Element)>();
            }
            var eventLines = lines.Skip(startIndex + 1).Take(endIndex - startIndex - 1).ToArray();
            var awlMessage = eventLines
                .Select(line =>
                 {
                     var parts = line.Split(';');

                     //if (parts.Length < 3) return (Message: string.Empty, Priority: string.Empty, Zone: "Zona desconhecida", Element: "Elemento desconhecido");
                     //var message = parts[1].Trim();
                     //var priority = parts[2].Trim();

                     var priority = parts.Last().Trim();
                     var message = parts.Reverse().Skip(1).FirstOrDefault()?.Trim();
                     if (message != null)
                     {
                         message = System.Text.RegularExpressions.Regex.Replace(message, @"[^\w\d\s]", " ").Replace('_', ' ');
                     }
                     //var zonePart = parts[0];

                     var zonePart = parts.FirstOrDefault(p => p.Contains("ZNE"));
                     string zone = "Zona desconhecida";
                     string element = "Elemento desconhecido";
                     if (zonePart != null)
                     {
                         var match = System.Text.RegularExpressions.Regex.Match(zonePart, @"ZNE(\d{2})");
                         if (match.Success)
                         {
                             zone = $"Zona {int.Parse(match.Groups[1].Value)}";
                         }
                         var matchElement = System.Text.RegularExpressions.Regex.Match(zonePart, @"ZNE\d{2}\+([\w\-]+)");
                         if (matchElement.Success)
                         {
                             element = matchElement.Groups[1].Value;
                         }
                     }

                     return (Message: message, Priority: priority, Zone: zone, Element: element);
                 })
                .Where(tuple => !string.IsNullOrEmpty(tuple.Message))
                .ToArray();
            return awlMessage;
        }
    }
}

