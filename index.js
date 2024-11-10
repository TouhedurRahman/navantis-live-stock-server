const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');

require('dotenv').config();
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fxqg8by.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // Database collections
        const whpcollections = client.db('navantis_live_stock_db').collection('wh-products');
        const whsincollections = client.db('navantis_live_stock_db').collection('wh-stock-in');

        // add a new product - warehouse api
        app.post('/wh-products', async (req, res) => {
            const newProduct = req.body;
            const { name } = newProduct;

            try {
                const existingProduct = await whpcollections.findOne({ name });

                if (existingProduct) {
                    return res.status(409).send({ message: 'Product already exists' });
                }

                // newProduct.createdAt = new Date();
                const result = await whpcollections.insertOne(newProduct);

                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Error adding product', error });
            }
        });

        // warehouse stock-in api
        app.post('/stock-in-wh', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.date || new Date().toISOString().split('T')[0];

                const existingProduct = await whsincollections.findOne({
                    name: newProduct.name,
                    price: newProduct.price,
                    date: productDate
                });

                if (existingProduct) {
                    const updatedProduct = await whsincollections.updateOne(
                        { _id: existingProduct._id },
                        { $inc: { quantity: newProduct.quantity } }
                    );
                    res.send({ message: 'Product quantity updated', updatedProduct });
                } else {
                    newProduct.date = productDate;
                    const result = await whsincollections.insertOne(newProduct);
                    res.send({ message: 'New product added', result });
                }
            } catch (error) {
                console.error("Error processing stock-in:", error);
                res.status(500).send({ message: 'Error processing stock-in', error });
            }
        });

        /* app.post('/stock-in-wh', async (req, res) => {
            const newProduct = req.body;
            newProduct.createdAt = new Date();
            const result = await whsincollections.insertOne(newProduct);
            res.send(result);
        }); */

        /* app.post('/stock-in-wh', async (req, res) => {
            const newProduct = req.body;
            const today = new Date().toISOString().split('T')[0];

            try {
                const existingProduct = await whsincollections.findOne({
                    name: newProduct.name,
                    createdAt: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59.999Z') }
                });

                if (existingProduct) {
                    const updatedProduct = await whsincollections.updateOne(
                        { _id: existingProduct._id },
                        { $inc: { quantity: newProduct.quantity } }
                    );
                    res.send({ message: 'Product quantity updated', updatedProduct });
                } else {
                    // newProduct.createdAt = new Date();
                    const result = await whsincollections.insertOne(newProduct);
                    res.send({ message: 'New product added', result });
                }
            } catch (error) {
                console.error("Error processing stock-in:", error);
                res.status(500).send({ message: 'Error processing stock-in', error });
            }
        }); */

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You're successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("✅ Database Successfully Connected!");
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});