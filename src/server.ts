import { server } from "./app";

const PORT = process.env.PORT || 3010;

server.listen(PORT, () => {
    console.log(`Servidor de videoconferencia ejecutándose en puerto ${PORT}`);
});
