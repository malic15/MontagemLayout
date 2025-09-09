using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
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
        private static System.Collections.Generic.List<(string Message, string Priority, string Zone, string Element, string Component, string Cabinet)> GetActiveMessages((string Message, string Priority, string Zone, string Element, string Component, string Cabinet)[] allMessages, int[] data)
        {
            var activeMessages = new System.Collections.Generic.List<(string Message, string Priority, string Zone, string Element, string Component, string Cabinet)>();
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
        private static (string Message, string Priority, string Zone, string Element, string Component, string Cabinet)[] ExtractAwlMessage(string filePath)
        {
            var lines = File.ReadAllLines(filePath, System.Text.Encoding.Latin1);
            int startIndex = Array.FindIndex(lines, line => line.Contains("EVENTS : STRUCT") || line.Contains("EVENT : STRUCT"));
            int endIndex = Array.FindIndex(lines, line => line.Contains("END_STRUCT"));

            if (startIndex == -1 || endIndex == -1 || startIndex >= endIndex)
            {
                return Array.Empty<(string Message, string Priority, string Zone, string Element, string Component, string Cabinet)>();
            }
            var eventLines = lines.Skip(startIndex + 1).Take(endIndex - startIndex - 1).ToArray();

            var awlMessage = eventLines
                .Select(line =>
                 {
                     var parts = line.Split(';');

                     //if (parts.Length < 3) return (Message: string.Empty, Priority: string.Empty, Zone: "Zona desconhecida", Element: "Elemento desconhecido");
                     //var message = parts[1].Trim();
                     //var priority = parts[2].Trim();
                     //Console.WriteLine(parts[1]);
                     string header = parts[0];
                     string codeAndMaybe = "";
                     string component = "NA";
                     string cabinet = "NA";
                     var priority = parts.Last().Trim();

                     var codePart = parts.FirstOrDefault(p => p.Contains("//=")) ?? parts[0];
                     string messageRaw = parts.Reverse().Skip(1).FirstOrDefault()?.Trim() ?? "";

                     var message = parts.Reverse().Skip(1).FirstOrDefault()?.Trim();
                     
                     if (message != null)
                     {
                         
                         message = System.Text.RegularExpressions.Regex.Replace(message, @"[^\w\d\s]", " ").Replace('_', ' ');
                         
                     }

                     var zonePart = parts.FirstOrDefault(p => p.Contains("ZNE"));
                     //Console.WriteLine(zonePart);
                     string zone = "Zona desconhecida";
                     string element = "Elemento desconhecido";
                     if (zonePart != null)
                     {
                         var match = System.Text.RegularExpressions.Regex.Match(zonePart, @"ZNE(\d{2})");
                         if (match.Success)
                         {
                             zone = $"Zona {int.Parse(match.Groups[1].Value)}";
                         }
                         //var matchElement = System.Text.RegularExpressions.Regex.Match(zonePart, @"ZNE\d{2}\+([\w\-]+)");
                         //if (matchElement.Success)
                         //{
                         //    element = matchElement.Groups[1].Value;
                         //}
                         var mTail = System.Text.RegularExpressions.Regex.Match(zonePart, @"ZNE\d{2}\+(?<tail>[^\s;]+)");
                         if (mTail.Success)
                         {
                             var tail = mTail.Groups["tail"].Value;
                             int dashIx = tail.IndexOf('-');
                             if (dashIx >= 0)
                             {
                                 element = tail.Substring(0, dashIx);
                                 component = tail.Substring(dashIx + 1);
                             }
                             else
                             {
                                 element = tail;
                             }
                         }

                         if (!string.IsNullOrEmpty(element) && element.StartsWith("H", StringComparison.OrdinalIgnoreCase))
                         {
                             var plusMatches = System.Text.RegularExpressions.Regex.Matches(messageRaw, @"\+([A-Z0-9_]+(?:/[A-Z0-9_]+)*)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);

                             if (plusMatches.Count > 0)
                             {
                                 cabinet = element;
                                 var tokens = plusMatches
                                    .Cast<System.Text.RegularExpressions.Match>()
                                    .Select(m => m.Groups[1].Value.Trim())
                                    // 1) descarta tudo que comece com ZNE (pega ZNE, ZNE0, ZNE02...)
                                    .Where(tok => !tok.StartsWith("ZNE", StringComparison.OrdinalIgnoreCase))
                                    // 2) descarta tokens muito curtos
                                    .Where(tok => tok.Length >= 3)
                                    // 3) exige alguma “cara” de elemento (tem dígito ou '_' ou '/')
                                    .Where(tok => tok.Any(char.IsDigit) || tok.Contains('_') || tok.Contains('/'))
                                    // dedup mantendo ordem
                                    .Aggregate(new System.Collections.Generic.List<string>(), (acc, tok) =>
                                    {
                                        if (!acc.Contains(tok)) acc.Add(tok);
                                        return acc;
                                    });

                                 // Só aplica override se sobrou algo útil
                                 if (tokens.Count > 0)
                                 {
                                     element = string.Join(" ", tokens);
                                 }
                             }
                             //if (cabinet != "NA")
                             //{
                             //    Console.WriteLine(element);
                             //}
                         }
                     }
                     return (Message: message, Priority: priority, Zone: zone, Element: element, Component: component, Cabinet: cabinet);
                 })
                .Where(tuple => !string.IsNullOrEmpty(tuple.Message))
                .ToArray();
            return awlMessage;
        }
    }
}

