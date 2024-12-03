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

        /***** Database collections *****/
        // admin collections
        const adminPuchaseCollections = client.db('navantis_live_stock_db').collection('order_list');

        // order stock collections
        const orderStockCollections = client.db('navantis_live_stock_db').collection('order_stock_wh');

        // warehouse collections
        const whProductsCollections = client.db('navantis_live_stock_db').collection('wh_products');
        const whStockInCollections = client.db('navantis_live_stock_db').collection('wh_stock_in');
        const whStockOutCollections = client.db('navantis_live_stock_db').collection('wh_stock_out');
        const whDamagedProductsCollections = client.db('navantis_live_stock_db').collection('wh_damaged_products');

        // depot collections
        const depotProductsCollections = client.db('navantis_live_stock_db').collection('depot_products');
        const depotStockInCollections = client.db('navantis_live_stock_db').collection('depot_stock_in');
        const depotExpCollections = client.db('navantis_live_stock_db').collection('depot_expired');

        // admin purchase order API
        app.post('/purchase-order', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.date || new Date().toISOString().split('T')[0];

                const existingProduct = await adminPuchaseCollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    date: productDate,
                });

                if (existingProduct) {
                    const updatedProduct = await adminPuchaseCollections.updateOne(
                        { _id: existingProduct._id },
                        {
                            $set: {
                                actualPrice: Number(newProduct.actualPrice),
                                tradePrice: Number(newProduct.tradePrice),
                            },
                            $inc: {
                                totalQuantity: Number(newProduct.totalQuantity),
                            },
                        }
                    );
                    res.send({ message: 'Product quantity updated', updatedProduct });
                } else {
                    // newProduct.date = productDate;
                    const result = await adminPuchaseCollections.insertOne(newProduct);
                    res.send({ message: 'New product added', result });
                }
            } catch (error) {
                console.error('Error processing stock-in:', error);
                res.status(500).send({ message: 'Error processing stock-in', error });
            }
        });

        // get all purchase order API
        app.get('/purchase-order', async (req, res) => {
            const result = await adminPuchaseCollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // order stockin warehouse API
        app.post('/order-stock-wh', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.date || new Date().toISOString().split('T')[0];

                const existingProduct = await orderStockCollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    date: productDate,
                });

                if (existingProduct) {
                    const updatedProduct = await orderStockCollections.updateOne(
                        { _id: existingProduct._id },
                        {
                            $set: {
                                actualPrice: Number(newProduct.actualPrice),
                                tradePrice: Number(newProduct.tradePrice),
                                status: newProduct.status
                            },
                            $inc: {
                                totalQuantity: Number(newProduct.totalQuantity),
                            },
                        }
                    );
                    res.send({ message: 'Product quantity updated', updatedProduct });
                } else {
                    const result = await orderStockCollections.insertOne(newProduct);
                    res.send({ message: 'New product added', result });
                }
            } catch (error) {
                console.error('Error processing stock-in:', error);
                res.status(500).send({ message: 'Error processing stock-in', error });
            }
        });

        // get all order stockin warehouse API
        app.get('/order-stock-wh', async (req, res) => {
            const result = await orderStockCollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // order stockin request API
        app.patch('/wh-req/:id', async (req, res) => {
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

                    actualPrice: updatedProduct.actualPrice,
                    tradePrice: updatedProduct.tradePrice,

                    boxQuantity: Number(updatedProduct.boxQuantity),
                    productWithBox: Number(updatedProduct.productWithBox),
                    productWithoutBox: Number(updatedProduct.productWithoutBox),

                    orderQuantity: Number(updatedProduct.orderQuantity),
                    totalQuantity: Number(updatedProduct.totalQuantity),

                    orderDate: updatedProduct.orderDate,
                    date: updatedProduct.date,

                    remarks: updatedProduct.remarks,
                    status: updatedProduct.status,

                    addedby: updatedProduct.addedby,
                    addedemail: updatedProduct.addedemail
                },
            };

            const result = await orderStockCollections.updateOne(filter, updateOperations, options);
            res.send(result);
        });

        // get all order stockin request API
        app.get('/wh-req', async (req, res) => {
            const result = await orderStockCollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // Add a new product - warehouse API
        app.post('/wh-products', async (req, res) => {
            const newProduct = req.body;
            const { productName, batch, expire } = newProduct;

            try {
                const existingProduct = await whProductsCollections.findOne({
                    productName,
                    batch,
                    expire,
                });

                if (existingProduct) {
                    return res
                        .status(409)
                        .send({ message: 'Product already exists with the same details' });
                }

                const result = await whProductsCollections.insertOne(newProduct);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Error adding product', error });
            }
        });

        // get all warehouse products API
        app.get('/wh-products', async (req, res) => {
            const result = await whProductsCollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // update warehouse product API
        app.patch('/wh-product/:id', async (req, res) => {
            const { id } = req.params;
            const updatedProduct = req.body;

            try {
                const existingProducts = await whProductsCollections.find({ productName: updatedProduct.productName }).toArray();

                if (existingProducts.length > 0) {
                    await whProductsCollections.updateMany(
                        { productName: updatedProduct.productName },
                        {
                            $set: {
                                actualPrice: Number(updatedProduct.actualPrice),
                                tradePrice: Number(updatedProduct.tradePrice),
                            },
                        }
                    );
                    const filter = { 
                        productName: updatedProduct.productName,
                        batch: updatedProduct.batch,
                        expire: updatedProduct.expire
                    };
                    const incrementQuantity = {
                        $inc: { totalQuantity: Number(updatedProduct.totalQuantity) },
                    };

                    const incrementResult = await whProductsCollections.updateOne(filter, incrementQuantity);

                    res.send({
                        message: 'Product updated successfully',
                        priceUpdate: true,
                        quantityIncrement: incrementResult.modifiedCount > 0,
                    });
                } else {
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

                    const result = await whProductsCollections.updateOne(filter, updateOperations, options);
                    res.send({
                        message: 'Product updated successfully',
                        priceUpdate: false,
                        quantityIncrement: false,
                        result,
                    });
                }
            } catch (error) {
                console.error('Error updating product:', error);
                res.status(500).send({ error: 'Failed to update product' });
            }
        });

        // get all warehouse stock-in API
        app.get('/stock-in-wh', async (req, res) => {
            const result = await whStockInCollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // warehouse stock-in API
        app.post('/stock-in-wh', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.date || new Date().toISOString().split('T')[0];

                const existingProduct = await whStockInCollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    date: productDate,
                });

                if (existingProduct) {
                    const updatedProduct = await whStockInCollections.updateOne(
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
                    const result = await whStockInCollections.insertOne(newProduct);
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

                const existingProduct = await whStockOutCollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    date: productDate,
                });

                if (existingProduct) {
                    const updatedProduct = await whStockOutCollections.updateOne(
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
                    const result = await whStockOutCollections.insertOne(newProduct);
                    res.send({ message: 'New product added', result });
                }
            } catch (error) {
                console.error('Error processing stock-in:', error);
                res.status(500).send({ message: 'Error processing stock-in', error });
            }
        });

        // get all warehouse stock out API
        app.get('/stock-out-wh', async (req, res) => {
            const result = await whStockOutCollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // warehouse damaged-product API
        app.post('/damaged-in-wh', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.date || new Date().toISOString().split('T')[0];

                const existingProduct = await whDamagedProductsCollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    date: productDate,
                });

                if (existingProduct) {
                    const updatedProduct = await whDamagedProductsCollections.updateOne(
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
                    const result = await whDamagedProductsCollections.insertOne(newProduct);
                    res.send({ message: 'Damaged product added', result });
                }
            } catch (error) {
                console.error('Error processing stock-in:', error);
                res.status(500).send({ message: 'Error processing stock-in', error });
            }
        });

        // get all damaged product API
        app.get('/damaged-in-wh', async (req, res) => {
            const result = await whDamagedProductsCollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // add depot products API
        app.post('/depot-products', async (req, res) => {
            const newProduct = req.body;

            try {
                const existingProduct = await depotProductsCollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                });

                if (existingProduct) {
                    const updatedProduct = await depotProductsCollections.updateOne(
                        { _id: existingProduct._id },
                        { $inc: { totalQuantity: Number(newProduct.totalQuantity) } }
                    );
                    res.send({ message: 'Product quantity updated', updatedProduct });
                } else {
                    const result = await depotProductsCollections.insertOne(newProduct);
                    res.send({ message: 'Depot new product added', result });
                }
            } catch (error) {
                console.error('Error add depot:', error);
                res.status(500).send({ message: 'Error add depot', error });
            }
        });

        // get all depot products API
        app.get('/depot-products', async (req, res) => {
            const result = await depotProductsCollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // update depot product API
        app.patch('/depot-product/:id', async (req, res) => {
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

            const result = await depotProductsCollections.updateOne(filter, updateOperations, options);
            res.send(result);
        });

        // delete depot expired product API
        app.delete('/depot-product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await depotProductsCollections.deleteOne(query);
            res.send(result);
        });

        // depot expired-product API
        app.post('/expired-in-depot', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.date || new Date().toISOString().split('T')[0];

                const existingProduct = await depotExpCollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    // date: productDate,
                });

                if (existingProduct) {
                    const updatedProduct = await depotExpCollections.updateOne(
                        { _id: existingProduct._id },
                        {
                            /* $set: {
                                remarks: newProduct.remarks,
                            }, */
                            $inc: {
                                totalQuantity: Number(newProduct.totalQuantity),
                            },
                        }
                    );
                    res.send({ message: 'Product quantity updated', updatedProduct });
                } else {
                    // newProduct.date = productDate;
                    const result = await depotExpCollections.insertOne(newProduct);
                    res.send({ message: 'Damaged product added', result });
                }
            } catch (error) {
                console.error('Error processing stock-in:', error);
                res.status(500).send({ message: 'Error processing stock-in', error });
            }
        });

        // get all depot expired product API
        app.get('/expired-in-depot', async (req, res) => {
            const result = await depotExpCollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // Depot stock-in API
        app.post('/stock-in-depot', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.date || new Date().toISOString().split('T')[0];

                const existingProduct = await depotStockInCollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    date: productDate,
                });

                if (existingProduct) {
                    const updatedProduct = await depotStockInCollections.updateOne(
                        { _id: existingProduct._id },
                        { $inc: { totalQuantity: Number(newProduct.totalQuantity) } }
                    );
                    res.send({ message: 'Product quantity updated', updatedProduct });
                } else {
                    newProduct.date = productDate;
                    const result = await depotStockInCollections.insertOne(newProduct);
                    res.send({ message: 'Depot new product added', result });
                }
            } catch (error) {
                console.error('Error processing stock-in:', error);
                res.status(500).send({ message: 'Error processing stock-in', error });
            }
        });

        // get all depot stock-in API
        app.get('/stock-in-depot', async (req, res) => {
            const result = await depotStockInCollections.find().sort({ _id: -1 }).toArray();
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