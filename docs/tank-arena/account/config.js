// The same backend serves accounts, Arena, and Tank Frontier.
window.FNAAC_SERVER_URL = ['localhost','127.0.0.1','[::1]'].includes(location.hostname) ? location.origin : 'https://play.fnaac.world';
