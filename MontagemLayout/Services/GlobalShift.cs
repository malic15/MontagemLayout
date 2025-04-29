namespace MontagemLayout.Services
{
    public class GlobalShift
    {
        public int ActualShift { get; set; }
        public string Shift { get; set; } = "";
        public TimeSpan ShiftTotalTime { get; set; }
        public DateTime currentShiftStart { get; set; }
    }
}