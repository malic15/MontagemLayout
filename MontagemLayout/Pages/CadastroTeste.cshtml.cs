using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace MontagemLayout.Pages
{
    public class CadastroTesteModel : PageModel
    {
        public bool hasData = false;
        public string firstName = "";
        public string lastName = "";
        public void OnGet()
        {
        }

        public void OnPost() 
        { 
            hasData = true;
            firstName = Request.Form["firstname"];
            lastName = Request.Form["lastname"];
        }
    }
}
