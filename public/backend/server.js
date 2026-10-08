require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MercadoPagoConfig, Preference } = require("mercadopago");

const app = express();

app.use(cors());
app.use(express.json());

const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
});

app.get("/", (req, res) => {
    res.send("Eletro Prime - Backend funcionando!");
});

app.post("/criar-pagamento", async (req, res) => {
    try {
        const { nome, preco } = req.body;

        const preference = new Preference(client);

        const resultado = await preference.create({
            body: {
                items: [
                    {
                        title: nome,
                        quantity: 1,
                        unit_price: Number(preco),
                        currency_id: "BRL"
                    }
                ]
            }
        });

        res.json({
            link: resultado.init_point
        });

    } catch (erro) {
        console.error("Erro:", erro);

        res.status(500).json({
            erro: "Erro ao criar pagamento"
        });
    }
});

app.listen(3000, () => {
    console.log("Eletro Prime rodando em http://localhost:3000");
});
