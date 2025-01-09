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

        /******************** Database collections ********************/

        /* user collections */
        const usersCollection = client.db('navantis_live_stock_db').collection('users');

        /* admin collections */
        const adminPuchaseCollections = client.db('navantis_live_stock_db').collection('order_list');
        const priceUpdateCollections = client.db('navantis_live_stock_db').collection('price_update');
        const damagedAndExpiredCollections = client.db('navantis_live_stock_db').collection('damaged_expired');

        /* warehouse collections */
        const orderStockCollections = client.db('navantis_live_stock_db').collection('order_stock_wh');
        const whProductsCollections = client.db('navantis_live_stock_db').collection('wh_products');
        const whStockInCollections = client.db('navantis_live_stock_db').collection('wh_stock_in');
        const whStockOutCollections = client.db('navantis_live_stock_db').collection('wh_stock_out');
        const whDamagedProductsCollections = client.db('navantis_live_stock_db').collection('damaged_products');

        /* depot collections */
        const depotReceiveReqCollections = client.db('navantis_live_stock_db').collection('depot_receive');
        const depotRequestCollections = client.db('navantis_live_stock_db').collection('depot_request');
        const depotProductsCollections = client.db('navantis_live_stock_db').collection('depot_products');
        const depotStockInCollections = client.db('navantis_live_stock_db').collection('depot_stock_in');
        const depotStockOutCollections = client.db('navantis_live_stock_db').collection('depot_stock_out');
        const depotExpReqCollections = client.db('navantis_live_stock_db').collection('expire_request');
        const depotExpiredCollections = client.db('navantis_live_stock_db').collection('depot_expired');

        /******************** User(s) Section ********************/

        // send user(s) data API
		app.post('/users', async (req, res) => {
			const user = req.body;
			const query = { email: user.email };
			const existingUser = await usersCollection.findOne(query);
			if (existingUser) {
				return res.send({ message: "User already exists" })
			}
			const result = await usersCollection.insertOne(user);
			res.send(result);
		});

        // get all user(s) API
        app.get('/users', async(req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });

        // get single user(s) api
		app.get('/user/:email', async (req, res) => {
			const email = req.params.email;
			const query = { email: email }
			const result = await usersCollection.findOne(query);
			res.send(result);
		});

        // update user's designation API
		app.patch('/users/admin/:id', async (req, res) => {
			const id = req.params.id;
			const filter = { _id: new ObjectId(id) }
            const updatedDesignation = req.body;
			const updateDoc = {
				$set: {
					designation: updatedDesignation.designation
				},
			};
			const result = await usersCollection.updateOne(filter, updateDoc);
			res.send(result);
		});

        // update user(s) profile API
		app.patch('/user/:email', async (req, res) => {
			const email = req.params.email;
			const filter = { email: email };
			const updatedUser = req.body;
			const options = { upsert: true };
			const updatedDoc = {
				$set: {
					...updatedUser,
				}
			}
			const result = await usersCollection.updateOne(
				filter,
				updatedDoc,
				options
			);
			res.send(result);
		});

        /******************** Admin Section ********************/

        // admin purchase order API
        app.post('/purchase-order', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.orderDate || new Date().toISOString().split('T')[0];

                const existingProduct = await adminPuchaseCollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    orderDate: productDate,
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

        // add a new price change details API
        app.post('/price-update', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.date || new Date().toISOString().split('T')[0];

                const existingProduct = await priceUpdateCollections.findOne({
                    productName: newProduct.productName,
                    date: productDate,
                });

                if (existingProduct) {
                    const updatedProduct = await priceUpdateCollections.updateOne(
                        { _id: existingProduct._id },
                        {
                            $set: {
                                actualPrice: Number(newProduct.actualPrice),
                                initialActualPrice: Number(newProduct.initialActualPrice),

                                tradePrice: Number(newProduct.tradePrice),
                                initialTradePrice: Number(newProduct.initialTradePrice),

                                initialQuantity: Number(newProduct.initialQuantity),
                            },
                            $inc: {
                                newQuantity: Number(newProduct.newQuantity),
                            },
                        }
                    );
                    res.send({ message: 'Product quantity updated', updatedProduct });
                } else {
                    const result = await priceUpdateCollections.insertOne(newProduct);
                    res.send({ message: 'New product added', result });
                }
            } catch (error) {
                console.error('Error price changing:', error);
                res.status(500).send({ message: 'Error price changing', error });
            }
        });

        // get all price update API
        app.get('/price-update', async (req, res) => {
            const result = await priceUpdateCollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // damaged and expired API
        app.post('/damaged-expired', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.date || new Date().toISOString().split('T')[0];

                const existingProduct = await damagedAndExpiredCollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    status: newProduct.status,
                    date: productDate,
                });

                if (existingProduct) {
                    const updatedProduct = await damagedAndExpiredCollections.updateOne(
                        { _id: existingProduct._id },
                        {
                            $inc: {
                                totalQuantity: Number(newProduct.totalQuantity),
                            },
                        }
                    );
                    res.send({ message: 'Product quantity updated', updatedProduct });
                } else {
                    newProduct.date = productDate;
                    const result = await damagedAndExpiredCollections.insertOne(newProduct);
                    res.send({ message: 'New product added', result });
                }
            } catch (error) {
                console.error('Error processing stock-in:', error);
                res.status(500).send({ message: 'Error processing damaged & expired', error });
            }
        });

        // get all damaged and expired API
        app.get('/damaged-expired', async (req, res) => {
            const result = await damagedAndExpiredCollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        /******************** Warehouse Section ********************/

        // order stockin warehouse API
        app.post('/order-stock-wh', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.orderDate || new Date().toISOString().split('T')[0];

                const existingProduct = await orderStockCollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    orderDate: productDate,
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
                    missingQuantity: Number(updatedProduct.missingQuantity),

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
                        expire: updatedProduct.expire,
                    };
        
                    const updatedQuantity = {
                        $set: { 
                            totalQuantity: Number(updatedProduct.totalQuantity),
                        },
                    };
        
                    const updatedQuantityResult = await whProductsCollections.updateOne(filter, updatedQuantity);
        
                    if (Number(updatedProduct.totalQuantity) === 0) {
                        await whProductsCollections.deleteOne(filter);
                        res.send({
                            message: 'Product updated and deleted because total quantity is 0',
                            priceUpdate: true,
                            quantityUpdate: false,
                        });
                        return;
                    }
        
                    res.send({
                        message: 'Product updated successfully',
                        priceUpdate: true,
                        quantityUpdate: updatedQuantityResult.modifiedCount > 0,
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
        
                    if (Number(updatedProduct.totalQuantity) === 0) {
                        await whProductsCollections.deleteOne(filter);
                        res.send({
                            message: 'Product updated and deleted because total quantity is 0',
                            priceUpdate: false,
                            quantityUpdate: false,
                        });
                        return;
                    }

                    res.send({
                        message: 'Product updated successfully',
                        priceUpdate: false,
                        quantityUpdate: false,
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
                            $inc: {
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

                const existingPendingProduct = await whDamagedProductsCollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    status: "pending",
                    date: productDate
                });

                if (existingPendingProduct) {
                    const updatedProduct = await whDamagedProductsCollections.updateOne(
                        { _id: existingPendingProduct._id },
                        {
                            $set: {
                                status: newProduct.status,
                                remarks: newProduct.remarks,
                            },
                            $inc: {
                                damageQuantity: Number(newProduct.damageQuantity)
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

        // delete damaged product API
        app.delete('/damaged-in-wh/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await whDamagedProductsCollections.deleteOne(query);
            res.send(result);
        });

        /******************** Depot Section ********************/

        // depot request product API
        app.post('/dpot-request', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.requestedDate || new Date().toISOString().split('T')[0];

                const existingRequestedProduct = await depotRequestCollections.findOne({
                    productName: newProduct.productName,
                    status: "requested",
                    // requestedDate: productDate
                });

                if (existingRequestedProduct) {
                    const updatedProduct = await depotRequestCollections.updateOne(
                        { _id: existingRequestedProduct._id },
                        {
                            $set: {
                                requestedDate: newProduct.productDate
                            },
                            $inc: {
                                requestedQuantity: Number(newProduct.requestedQuantity)
                            },
                        }
                    );
                    res.send({ message: 'Product quantity updated', updatedProduct });
                } else {
                    const result = await depotRequestCollections.insertOne(newProduct);
                    res.send({ message: 'Depot request added', result });
                }
            } catch (error) {
                console.error('Error depot request:', error);
                res.status(500).send({ message: 'Error depot request', error });
            }
        });

        // get all depot request product API
        app.get('/depot-request', async(req, res) => {
            const result = await depotRequestCollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // depot request product update API
        app.patch('/depot-request/:id', async (req, res) => {
            const { id } = req.params;
            const updatedProduct = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };

            const updateOperations = {
                $set: {
                    ...updatedProduct
                },
            };

            const result = await depotRequestCollections.updateOne(filter, updateOperations, options);
            res.send(result);
        });

        // delete depot request API
        app.delete('/depot-request/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await depotRequestCollections.deleteOne(query);
            res.send(result);
        });

        // add depot receive request API
        app.post('/depot-receive-req', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.date || new Date().toISOString().split('T')[0];

                const existingProduct = await depotReceiveReqCollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    date: productDate,
                });

                if (existingProduct) {
                    const updatedProduct = await depotReceiveReqCollections.updateOne(
                        { _id: existingProduct._id },
                        {
                            $inc: {
                                totalQuantity: Number(newProduct.totalQuantity),
                            },
                        }
                    );
                    res.send({ message: 'Product quantity updated', updatedProduct });
                } else {
                    newProduct.date = productDate;
                    const result = await depotReceiveReqCollections.insertOne(newProduct);
                    res.send({ message: 'New product added', result });
                }
            } catch (error) {
                console.error('Error receive request:', error);
                res.status(500).send({ message: 'Error receive request', error });
            }
        });

        // get all depot receive request API
        app.get('/depot-receive-req', async(req, res) => {
            const result = await depotReceiveReqCollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // delete depot receive request API
        app.delete('/depot-receive-req/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await depotReceiveReqCollections.deleteOne(query);
            res.send(result);
        });

        // Add a new product - depot API
        app.post('/depot-products', async (req, res) => {
            const newProduct = req.body;

            try {
                const priceUpdateResult = await depotProductsCollections.updateMany(
                    { productName: newProduct.productName },
                    {
                        $set: {
                            actualPrice: Number(newProduct.actualPrice),
                            tradePrice: Number(newProduct.tradePrice),
                        },
                    }
                );
        
                const quantityFilter = {
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                };
        
                const existingProduct = await depotProductsCollections.findOne(quantityFilter);
        
                if (existingProduct) {
                    const updatedQuantity = {
                        $inc: {
                            totalQuantity: Number(newProduct.totalQuantity),
                        },
                    };
        
                    const quantityUpdateResult = await depotProductsCollections.updateOne(
                        quantityFilter,
                        updatedQuantity
                    );
        
                    res.send({
                        message: 'Product updated successfully',
                        priceUpdate: priceUpdateResult.modifiedCount > 0,
                        quantityUpdate: quantityUpdateResult.modifiedCount > 0,
                    });
                } else {
                    const insertResult = await depotProductsCollections.insertOne(newProduct);
                    res.send({
                        message: 'New product added successfully',
                        insertedId: insertResult.insertedId,
                    });
                }
            } catch (error) {
                res.status(500).send({ message: 'Error adding or updating product', error });
            }
        });       

        // get all depot products API
        app.get('/depot-products', async (req, res) => {
            const result = await depotProductsCollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // delete depot expired product API
        app.delete('/depot-product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await depotProductsCollections.deleteOne(query);
            res.send(result);
        });

        // depot expire request API
        app.post('/expire-request', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.date || new Date().toISOString().split('T')[0];

                const existingProduct = await depotExpReqCollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    status: "pending",
                });

                if (existingProduct) {
                    const updatedProduct = await depotExpReqCollections.updateOne(
                        { _id: existingProduct._id },
                        {
                            $set: {
                                status: newProduct.status,
                            },
                            $inc: {
                                totalQuantity: Number(newProduct.totalQuantity),
                            },
                        }
                    );
                    res.send({ message: 'Product quantity updated', updatedProduct });
                } else {
                    const result = await depotExpReqCollections.insertOne(newProduct);
                    res.send({ message: 'Damaged product added', result });
                }
            } catch (error) {
                console.error('Error processing stock-in:', error);
                res.status(500).send({ message: 'Error processing stock-in', error });
            }
        });

        // get all depot expire request API
        app.get('/expire-request', async (req, res) => {
            const result = await depotExpReqCollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // delete depot expired request API
        app.delete('/expire-request/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await depotExpReqCollections.deleteOne(query);
            res.send(result);
        });

        // depot expired api added
        app.post('/depot-expired', async (req, res) => {
            const newProduct = req.body;

            try {
                const existingProduct = await depotExpiredCollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                });

                if (existingProduct) {
                    const updatedProduct = await depotExpiredCollections.updateOne(
                        { _id: existingProduct._id },
                        {
                            $inc: {
                                totalQuantity: Number(newProduct.totalQuantity),
                            },
                        }
                    );
                    res.send({ message: 'Product quantity updated', updatedProduct });
                } else {
                    const result = await depotExpiredCollections.insertOne(newProduct);
                    res.send({ message: 'Damaged product added', result });
                }
            } catch (error) {
                console.error('Error processing stock-in:', error);
                res.status(500).send({ message: 'Error processing stock-in', error });
            }
        });

        // get all depot expired product API
        app.get('/depot-expired', async (req, res) => {
            const result = await depotExpiredCollections.find().sort({ _id: -1 }).toArray();
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

        // depot stock-out API
        app.post('/stock-out-depot', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.date || new Date().toISOString().split('T')[0];

                const existingProduct = await depotStockOutCollections.findOne({
                    productName: newProduct.productName,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    date: productDate,
                });

                if (existingProduct) {
                    const updatedProduct = await depotStockOutCollections.updateOne(
                        { _id: existingProduct._id },
                        {
                            $inc: {
                                totalQuantity: Number(newProduct.totalQuantity),
                            },
                        }
                    );
                    res.send({ message: 'Product quantity updated', updatedProduct });
                } else {
                    newProduct.date = productDate;
                    const result = await depotStockOutCollections.insertOne(newProduct);
                    res.send({ message: 'New product added', result });
                }
            } catch (error) {
                console.error('Error processing stock-in:', error);
                res.status(500).send({ message: 'Error processing stock-in', error });
            }
        });

        // get all depot stock-out API
        app.get('/stock-out-depot', async (req, res) => {
            const result = await depotStockOutCollections.find().sort({ _id: -1 }).toArray();
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