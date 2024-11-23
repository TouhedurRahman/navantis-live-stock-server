const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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
    },
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // Database collections
        const whpcollections = client.db('navantis_live_stock_db').collection('wh-products');
        const whsincollections = client.db('navantis_live_stock_db').collection('wh-stock-in');
        const whsoutcollections = client.db('navantis_live_stock_db').collection('wh-stock-out');
        const whdamagedcollections = client.db('navantis_live_stock_db').collection('wh-damaged-product');
        const depotpcollections = client.db('navantis_live_stock_db').collection('depot-products');
        const depotincollections = client.db('navantis_live_stock_db').collection('depot-stock-in');

        // Add a new product - warehouse API
        app.post('/wh-products', async (req, res) => {
            const newProduct = req.body;
            const { productName, batch, expire } = newProduct;

            try {
                const existingProduct = await whpcollections.findOne({
                    productName,
                    batch,
                    expire,
                });

                if (existingProduct) {
                    return res
                        .status(409)
                        .send({ message: 'Product already exists with the same details' });
                }

                const result = await whpcollections.insertOne(newProduct);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Error adding product', error });
            }
        });

        // get all warehouse products API
        app.get('/wh-products', async (req, res) => {
            const result = await whpcollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // update warehouse product API
        app.patch('/wh-product/:id', async (req, res) => {
            const { id } = req.params;
            const updatedProduct = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };

            const updateOperations = {
                $set: {
                    productName: updatedProduct.productName,
                    productCode: updatedProduct.productCode,
                    batch: updatedProduct.batch,
                    expire: updatedProduct.expire,
                    actualPrice: Number(updatedProduct.actualPrice),
                    tradePrice: Number(updatedProduct.tradePrice),
                    totalQuantity: Number(updatedProduct.totalQuantity),
                },
            };

            const result = await whpcollections.updateOne(filter, updateOperations, options);
            res.send(result);
        });

        // get all warehouse stock-in API
        app.get('/stock-in-wh', async (req, res) => {
            const result = await whsincollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // warehouse stock-in API
        app.post('/stock-in-wh', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.date || new Date().toISOString().split('T')[0];

                const existingProduct = await whsincollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    date: productDate,
                });

                if (existingProduct) {
                    const updatedProduct = await whsincollections.updateOne(
                        { _id: existingProduct._id },
                        {
                            $set: {
                                actualPrice: Number(newProduct.actualPrice),
                                tradePrice: Number(newProduct.tradePrice),
                                remarks: newProduct.remarks,
                            },
                            $inc: {
                                boxQuantity: Number(newProduct.boxQuantity),
                                productWithBox: Number(newProduct.productWithBox),
                                productWithoutBox: Number(newProduct.productWithoutBox),
                                totalQuantity: Number(newProduct.totalQuantity),
                            },
                        }
                    );
                    res.send({ message: 'Product quantity updated', updatedProduct });
                } else {
                    newProduct.date = productDate;
                    const result = await whsincollections.insertOne(newProduct);
                    res.send({ message: 'New product added', result });
                }
            } catch (error) {
                console.error('Error processing stock-in:', error);
                res.status(500).send({ message: 'Error processing stock-in', error });
            }
        });

        // warehouse stock-out API
        app.post('/stock-out-wh', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.date || new Date().toISOString().split('T')[0];

                const existingProduct = await whsoutcollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    date: productDate,
                });

                if (existingProduct) {
                    const updatedProduct = await whsoutcollections.updateOne(
                        { _id: existingProduct._id },
                        {
                            $set: {
                                actualPrice: Number(newProduct.actualPrice),
                                tradePrice: Number(newProduct.tradePrice),
                                remarks: newProduct.remarks,
                            },
                            $inc: {
                                boxQuantity: Number(newProduct.boxQuantity),
                                productWithBox: Number(newProduct.productWithBox),
                                productWithoutBox: Number(newProduct.productWithoutBox),
                                totalQuantity: Number(newProduct.totalQuantity),
                            },
                        }
                    );
                    res.send({ message: 'Product quantity updated', updatedProduct });
                } else {
                    newProduct.date = productDate;
                    const result = await whsoutcollections.insertOne(newProduct);
                    res.send({ message: 'New product added', result });
                }
            } catch (error) {
                console.error('Error processing stock-in:', error);
                res.status(500).send({ message: 'Error processing stock-in', error });
            }
        });

        // get all warehouse stock out API
        app.get('/stock-out-wh', async (req, res) => {
            const result = await whsoutcollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // warehouse damaged-product API
        app.post('/damaged-in-wh', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.date || new Date().toISOString().split('T')[0];

                const existingProduct = await whdamagedcollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    date: productDate,
                });

                if (existingProduct) {
                    const updatedProduct = await whdamagedcollections.updateOne(
                        { _id: existingProduct._id },
                        {
                            $set: {
                                remarks: newProduct.remarks,
                            },
                            $inc: {
                                totalQuantity: Number(newProduct.totalQuantity),
                            },
                        }
                    );
                    res.send({ message: 'Product quantity updated', updatedProduct });
                } else {
                    newProduct.date = productDate;
                    const result = await whdamagedcollections.insertOne(newProduct);
                    res.send({ message: 'Damaged product added', result });
                }
            } catch (error) {
                console.error('Error processing stock-in:', error);
                res.status(500).send({ message: 'Error processing stock-in', error });
            }
        });

        // get all damaged product API
        app.get('/damaged-in-wh', async (req, res) => {
            const result = await whdamagedcollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // add depot products API
        app.post('/depot-products', async (req, res) => {
            const newProduct = req.body;

            try {
                const existingProduct = await depotpcollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                });

                if (existingProduct) {
                    const updatedProduct = await depotpcollections.updateOne(
                        { _id: existingProduct._id },
                        { $inc: { totalQuantity: Number(newProduct.totalQuantity) } }
                    );
                    res.send({ message: 'Product quantity updated', updatedProduct });
                } else {
                    const result = await depotpcollections.insertOne(newProduct);
                    res.send({ message: 'Depot new product added', result });
                }
            } catch (error) {
                console.error('Error add depot:', error);
                res.status(500).send({ message: 'Error add depot', error });
            }
        });

        // get all depot products API
        app.get('/depot-products', async (req, res) => {
            const result = await depotpcollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // Depot stock-in API
        app.post('/stock-in-depot', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.date || new Date().toISOString().split('T')[0];

                const existingProduct = await depotincollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    date: productDate,
                });

                if (existingProduct) {
                    const updatedProduct = await depotincollections.updateOne(
                        { _id: existingProduct._id },
                        { $inc: { totalQuantity: Number(newProduct.totalQuantity) } }
                    );
                    res.send({ message: 'Product quantity updated', updatedProduct });
                } else {
                    newProduct.date = productDate;
                    const result = await depotincollections.insertOne(newProduct);
                    res.send({ message: 'Depot new product added', result });
                }
            } catch (error) {
                console.error('Error processing stock-in:', error);
                res.status(500).send({ message: 'Error processing stock-in', error });
            }
        });

        // get all depot stock-in API
        app.get('/stock-in-depot', async (req, res) => {
            const result = await depotincollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        await client.db('admin').command({ ping: 1 });
        console.log("Pinged your deployment. You're successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('✅ Database Successfully Connected!');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});