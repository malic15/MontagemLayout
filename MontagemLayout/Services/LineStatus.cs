namespace MontagemLayout.Services
{
    public class LineStatus
    {
        private Dictionary<string, Dictionary<int, PdtInfo>> _pdtData = new Dictionary<string, Dictionary<int, PdtInfo>>();

        public Dictionary<string, Dictionary<int, PdtInfo>> GetPdtData()
        {
            return _pdtData;
        }
    }
}
