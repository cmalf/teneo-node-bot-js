const config = {
  Useragent: 'Mozilla/5.0', // Change with your UserAgent on default browser
  ApiKey: 'OwAG3kib1ivOJG4Y0OCZ8lJETa6ypvsDtGmdhcjB', // don't change it 
  PROXY_FILE: "proxies.txt", // path to your proxy file
  Timers: 5, // delayed between accounts prossesing (default is 5 seconds)
  MaxCF_Solve_Wait: 120000 // delayed for solving Turntile Cloudflare (default is 1 minutes 'depen on your proxy qualities')
}

module.exports = { config };