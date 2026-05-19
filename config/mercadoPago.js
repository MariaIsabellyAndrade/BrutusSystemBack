import dotenv from "dotenv";
import { MercadoPagoConfig } from "mercadopago";

dotenv.config();

const client =
    new MercadoPagoConfig({

        accessToken:
            process.env.MP_ACCESS_TOKEN
    });

export default client;