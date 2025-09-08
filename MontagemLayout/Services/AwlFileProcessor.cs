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

            var rxZone = new Regex(@"ZNE(?<num>\d{2})");
            var rxAfterZone = new Regex(@"ZNE\d{2}\+(?<tail>[^\s;]+)");              // pega o trecho após ZNE##+
            var rxMsgElement = new Regex(@"\+(?<elt>[A-Z0-9]+(?:_[A-Z0-9]+)?)");      // ex.: +TQ_01
            var rxCabinetHint = new Regex(@"^HCZ?\d{2}$", RegexOptions.IgnoreCase);   // ex.: HCZ01 (pode ajustar os prefixos)


            var awlMessage = eventLines
                .Select(line =>
                 {
                     var parts = line.Split(';');

                     //if (parts.Length < 3) return (Message: string.Empty, Priority: string.Empty, Zone: "Zona desconhecida", Element: "Elemento desconhecido");
                     //var message = parts[1].Trim();
                     //var priority = parts[2].Trim();
                     string header = parts[0];           // contém E#### e o " : BOOL "
                     string codeAndMaybe = "";           // onde fica o //=... (parte antes da mensagem)
                     string messageRaw = "";             // mensagem textual (entre os ';')

                     var priority = parts.Last().Trim();

                     var codePart = parts.FirstOrDefault(p => p.Contains("//="));
                     if (codePart == null)
                         codePart = parts[0];


                     //var message = parts.Reverse().Skip(1).FirstOrDefault()?.Trim();
                     //if (message != null)
                     //{
                     //    message = System.Text.RegularExpressions.Regex.Replace(message, @"[^\w\d\s]", " ").Replace('_', ' ');
                     //}

                     //var zonePart = parts.FirstOrDefault(p => p.Contains("ZNE"));
                     //string zone = "Zona desconhecida";
                     //string element = "Elemento desconhecido";
                     //if (zonePart != null)
                     //{
                     //    var match = System.Text.RegularExpressions.Regex.Match(zonePart, @"ZNE(\d{2})");
                     //    if (match.Success)
                     //    {
                     //        zone = $"Zona {int.Parse(match.Groups[1].Value)}";
                     //    }
                     //    var matchElement = System.Text.RegularExpressions.Regex.Match(zonePart, @"ZNE\d{2}\+([\w\-]+)");
                     //    if (matchElement.Success)
                     //    {
                     //        element = matchElement.Groups[1].Value;
                     //    }
                     //}

                     // mensagem é o penúltimo campo
                     messageRaw = parts.Reverse().Skip(1).FirstOrDefault()?.Trim() ?? "";

                     // -------- Zone --------
                     string zone = "Zona desconhecida";
                    var mz = rxZone.Match(codePart);
                    if (mz.Success)
                    {
                        if (int.TryParse(mz.Groups["num"].Value, out int z))
                            zone = $"Zona {z}";
                    }

                    // -------- Element / Component / Cabinet --------
                    string? element = null;
                    string? component = null;
                    string? cabinet = null;

                    // 1) Tentar achar elemento na MENSAGEM (caso "+TQ_01")
                    var me = rxMsgElement.Match(messageRaw);
                    if (me.Success)
                        element = me.Groups["elt"].Value;

                    // 2) Parsear o trecho após a ZNE no cabeçalho
                    //    Ex.: "ZNE01+HCZ01-U__01"  → base=HCZ01, comp=U__01
                    //         "ZNE01+TTS01-SQA01" → base=TTS01, comp=SQA01
                    var tailMatch = rxAfterZone.Match(codePart);
                    if (tailMatch.Success)
                    {
                        var tail = tailMatch.Groups["tail"].Value; // ex.: "HCZ01-U__01" ou "TTS01-SQA01" ou "TTS01"
                        // se houver + adicionais, pegue só o primeiro segmento após a ZNE
                        var firstSeg = tail.Split('+')[0];         // garante que só pegamos o primeiro bloco
                        string baseToken = firstSeg;
                        string? compToken = null;

                        // Se tiver componente, vem após '-'
                        var dashIx = firstSeg.IndexOf('-');
                        if (dashIx >= 0)
                        {
                            baseToken = firstSeg.Substring(0, dashIx);
                            compToken = firstSeg.Substring(dashIx + 1);
                        }

                        // Normaliza component (U__01 -> U_01)
                        if (!string.IsNullOrWhiteSpace(compToken))
                        {
                            component = Regex.Replace(compToken, "_{2,}", "_"); // colapsa "__" em "_"
                        }

                        // Se o elemento NÃO veio da mensagem, usar o baseToken como fallback
                        if (string.IsNullOrWhiteSpace(element))
                        {
                            element = baseToken;
                        }
                        else
                        {
                            // Se o elemento veio da mensagem e o baseToken parece armário (HCZ01), expor como Cabinet
                            if (rxCabinetHint.IsMatch(baseToken))
                                cabinet = baseToken;
                        }

                        // Caso não tenha vindo da mensagem e o baseToken seja claramente armário,
                        // ainda faz sentido expor cabinet e tentar achar o elemento em outro lugar?
                        // Pela sua regra, só quando o elemento vem no final (na mensagem) é que queremos o armário.
                        // Portanto, só setamos cabinet quando o elemento foi da mensagem.
                    }

                    // Sanitiza mensagem para exibição (sem tirar o "+TQ_01" que já capturamos)
                    string message = Regex.Replace(messageRaw, @"[^\w\d\s\+]", " ").Replace('_', ' ').Trim();

                    // Defaults
                    element ??= "Elemento desconhecido";


                     return (Message: message, Priority: priority, Zone: zone, Element: element, Component: component, Cabinet: cabinet);
                 })
                .Where(tuple => !string.IsNullOrEmpty(tuple.Message))
                .ToArray();
            return awlMessage;
        }
    }
}

