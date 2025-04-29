namespace MontagemLayout.Services
{
    using System;
    using System.Collections.Generic;
    using System.Threading.Tasks;
    public class CooldownManager
    {
        private readonly Dictionary<string, DateTime> lastCallByFunction = new();
        private readonly Dictionary<string, TimeSpan> coolDownByFunction = new();
        public void SetCoolDown(string key, TimeSpan coolDown)
        {
            coolDownByFunction[key] = coolDown;
        }
        public async Task<bool> VerifyCoolDownAsync(string key)
        {
            if (!lastCallByFunction.ContainsKey(key))
            {
                lastCallByFunction[key] = DateTime.MinValue;
            }

            var lastCall = lastCallByFunction[key];
            var coolDown = coolDownByFunction[key];

            if (DateTime.Now - lastCall >= coolDown)
            {
                lastCallByFunction[key] = DateTime.Now;
                return true;
            }
            var delay = coolDown - (DateTime.Now - lastCall);
            await Task.Delay(delay);
            lastCallByFunction[key] = DateTime.Now;
            return true;
        }
    }
}