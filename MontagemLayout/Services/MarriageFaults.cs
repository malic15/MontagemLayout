using MySql.Data.MySqlClient;
using System;
using System.Text.Json;
using System.Threading.Tasks;

namespace MontagemLayout.Services
{
    public class MarriageFaults
    {
        private string connectionString = "Server=172.29.151.26;Port=3307;Database=marriagefault;Uid=adminfault;Pwd=mathe;Connect Timeout=2;";
        public async Task StorePayloadDataAsync(string jsonPayload)
        {
            var payload = JsonDocument.Parse(jsonPayload);
            var dataArray = payload.RootElement.GetProperty("data").EnumerateArray().ToList();
            int mainPallet = dataArray[0].GetInt32();
            int gancho = dataArray[1].GetInt32();
            int modelo = dataArray[2].GetInt32();
            bool pml01 = dataArray[3].GetInt32() != 0;
            bool pml02 = dataArray[4].GetInt32() != 0;
            bool pml03 = dataArray[5].GetInt32() != 0;
            bool pml04 = dataArray[6].GetInt32() != 0;
            int semiPalletGoma = dataArray[7].GetInt32();
            int semiPalletGomp = dataArray[8].GetInt32();
            DateTime dataHora = DateTime.Now;

            Console.WriteLine("mainPallet: " + mainPallet);
            Console.WriteLine("gancho: " + gancho);
            Console.WriteLine("modelo: " + modelo);
            Console.WriteLine("pml01: " + pml01);
            Console.WriteLine("pml02: " + pml02);
            Console.WriteLine("pml03: " + pml03);
            Console.WriteLine("pml04: " + pml04);
            Console.WriteLine("semiPalletGoma: " + semiPalletGoma);
            Console.WriteLine("semiPalletGomp: " + semiPalletGomp);

            using (var connection = new MySqlConnection(connectionString))
            {
                await connection.OpenAsync();
                string query = @"
                    INSERT INTO marriagefault 
                    (MainPallet, Gancho, Modelo, PML01, PML02, PML03, PML04, SemiPallet_goma, SemiPallet_Gomp, DataHora)
                    VALUES (@MainPallet, @Gancho, @Modelo, @PML01, @PML02, @PML03, @PML04, @SemiPallet_goma, @SemiPallet_Gomp, @DataHora);
                ";

                using (var command = new MySqlCommand(query, connection))
                {
                    command.Parameters.AddWithValue("@MainPallet", mainPallet);
                    command.Parameters.AddWithValue("@Gancho", gancho);
                    command.Parameters.AddWithValue("@Modelo", modelo);
                    command.Parameters.AddWithValue("@PML01", pml01);
                    command.Parameters.AddWithValue("@PML02", pml02);
                    command.Parameters.AddWithValue("@PML03", pml03);
                    command.Parameters.AddWithValue("@PML04", pml04);
                    command.Parameters.AddWithValue("@SemiPallet_goma", semiPalletGoma);
                    command.Parameters.AddWithValue("@SemiPallet_Gomp", semiPalletGomp);
                    command.Parameters.AddWithValue("@DataHora", dataHora);

                    await command.ExecuteNonQueryAsync();
                }
            }
        }
    }
}
