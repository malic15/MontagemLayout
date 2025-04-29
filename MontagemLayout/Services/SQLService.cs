using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;

namespace MontagemLayout.Services
{
    public class SQLService
    {
        public int shiftNow = 0;
        private readonly string _connectionString = "Server=172.29.182.44\\BORDERO;Database=DBTIONPL;User Id=sa;Password=manager;TrustServerCertificate=True;Encrypt=False;Connection Timeout=30;";

        public async Task<int> GetProdLineDataAsync()
        {
            try
            {
                using (SqlConnection connection = new SqlConnection(_connectionString))
                {
                    await connection.OpenAsync();

                    string query = "SELECT TOP 10 [PezziImpostati] FROM [DBTIONPL].[dbo].[RT_tblDatiTratto]";

                    using (SqlCommand command = new SqlCommand(query, connection))
                    using (SqlDataReader reader = await command.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            int total = reader.IsDBNull(0) ? 0 : reader.GetInt32(0);
                            Console.WriteLine($"Valor do Target de Produção: {total}");
                            return total;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro ao acessar o banco de dados: {ex.Message}");
            }

            return 0;
        }
    }
}