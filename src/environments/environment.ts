export const environment = {
  production: false,
  // Emulador Android: troque localhost por 10.0.2.2. Dispositivo físico: use o IP da máquina
  // rodando o backend (mesma rede Wi-Fi), ex. http://192.168.0.10:3000/api.
  apiUrl: 'http://localhost:3000/api',
  // ID do cliente OAuth "Web" do projeto Google/Firebase (o mesmo em GOOGLE_CLIENT_IDS no backend).
  googleWebClientId: '855281869574-aju639p0f05gdfi2hiskrmi1gsh1nrrt.apps.googleusercontent.com',
};
