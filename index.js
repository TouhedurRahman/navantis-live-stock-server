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

        /* customer collections */
        const customerCollections = client.db('navantis_live_stock_db').collection('customers');

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

        /* rider collections */
        const riderCollections = client.db('navantis_live_stock_db').collection('riders');

        /* order collections */
        const orderCollections = client.db('navantis_live_stock_db').collection('orders');

        /* order collections */
        const paymentCollections = client.db('navantis_live_stock_db').collection('payments');

        /* return collections */
        const returnCollections = client.db('navantis_live_stock_db').collection('returns');

        /* expired return collections */
        const expiredReturnCollections = client.db('navantis_live_stock_db').collection('expired_returns');

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

        /******************** Customer(s) Section ********************/
        // add a new customer(s) API
        app.post('/customers', async (req, res) => {
            try {
                const newCustomer = req.body;
        
                const existingCustomer = await customerCollections.findOne({
                    customerName: { $regex: `^${newCustomer.customerName}$`, $options: 'i' }
                });
        
                if (!existingCustomer) {
                    const latestCustomer = await customerCollections.findOne(
                        { customerId: { $regex: `^PHAR` } },
                        { sort: { customerId: -1 } }
                    );
        
                    let serialNumber = 1;
                    if (latestCustomer) {
                        const latestCustomerId = latestCustomer.customerId;
                        serialNumber = parseInt(latestCustomerId.slice(-3)) + 1;
                    }
        
                    const customerId = `PHAR${serialNumber.toString().padStart(3, '0')}`;
                    newCustomer.customerId = customerId;
        
                    const result = await customerCollections.insertOne(newCustomer);
                    res.send(result);
                } else {
                    res.status(400).send({ message: 'Customer already exists.' });
                }
            } catch (error) {
                console.error('Error creating customer:', error);
                res.status(500).send({ message: 'Failed to create customer', error });
            }
        });

        // get all customer(s) API
        app.get('/customers', async (req, res) => {
            const result = await customerCollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // update customer(s) API
		app.patch('/customer/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const updatedCustomer = req.body;
                const filter = { _id: new ObjectId(id) };
                const options = { upsert: true };
        
                const updatedDoc = {
                    $set: {
                        ...updatedCustomer
                    }
                };
        
                const result = await customerCollections.updateOne(filter, updatedDoc, options);
                res.send(result);
            } catch (error) {
                res.status(500).json({ message: "Internal Server Error", error });
            }
        });

        // update customer(s) status API
		app.patch('/customer-status/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const updatedCustomer = req.body;
                const filter = { _id: new ObjectId(id) };
                const options = { upsert: true };
        
                const updatedDoc = {
                    $set: {
                        status: updatedCustomer.status,
                        ...(updatedCustomer.status === 'approved' && {
                            approvedBy: updatedCustomer.approvedBy,
                            approvedEmail: updatedCustomer.approvedEmail
                        })
                    }
                };
        
                const result = await customerCollections.updateOne(filter, updatedDoc, options);
                res.send(result);
            } catch (error) {
                res.status(500).json({ message: "Internal Server Error", error });
            }
        });

        // delete customer(s) API
        app.delete('/customer/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await customerCollections.deleteOne(query);
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
                    netweight: newProduct.netweight,
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

        // delete admin purchase order(s) API
        app.delete('/purchase-order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await adminPuchaseCollections.deleteOne(query);
            res.send(result);
        });

        // add a new price change details API
        app.post('/price-update', async (req, res) => {
            const newProduct = req.body;

            try {
                const productDate = newProduct.date || new Date().toISOString().split('T')[0];

                const existingProduct = await priceUpdateCollections.findOne({
                    productName: newProduct.productName,
                    netWeight: newProduct.netWeight,
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
                    netWeight: newProduct.netWeight,
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
                    netweight: newProduct.netweight,
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
                    netWeight: updatedProduct.netWeight,
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
            const { productName, netWeight, batch, expire } = newProduct;

            try {
                const existingProduct = await whProductsCollections.findOne({
                    productName,
                    netWeight,
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
                const existingProducts = await whProductsCollections.find({ 
                    productName: updatedProduct.productName,
                    netWeight: updatedProduct.netWeight,
                }).toArray();
        
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
                    netWeight: newProduct.netWeight,
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
                    netWeight: newProduct.netWeight,
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
                    netWeight: newProduct.netWeight,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    status: "pending",
                    date: productDate
                });

                if (existingPendingProduct) {
                    if (newProduct.status === 'pending') {
                        const updatedProduct = await whDamagedProductsCollections.updateOne(
                            { _id: new ObjectId(existingPendingProduct._id) },
                            {
                                $set: {
                                    remarks: newProduct.remarks,
                                },
                                $inc: {
                                    damageQuantity: Number(newProduct.damageQuantity)
                                },
                            }
                        );
                        res.send({ message: 'Pending product quantity updated', updatedProduct });
                    } else {
                        const updatedProduct = await whDamagedProductsCollections.updateOne(
                            { _id: new ObjectId(existingPendingProduct._id) },
                            {
                                $set: {
                                    status: newProduct.status,
                                    remarks: newProduct.remarks,
                                },
                            }
                        );
                        res.send({ message: 'Product status updated to approved', updatedProduct });
                    }

                } else {
                    newProduct.date = productDate;
                    const result = await whDamagedProductsCollections.insertOne(newProduct);
                    res.send({ message: 'New damaged product added', result });
                }
            } catch (error) {
                console.error('Error processing damaged-in:', error);
                res.status(500).send({ message: 'Error processing damaged-in', error });
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
                    netWeight: newProduct.netWeight,
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
                    netWeight: newProduct.netWeight,
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
                    { 
                        productName: newProduct.productName,
                        netWeight: newProduct.netWeight
                    },
                    {
                        $set: {
                            actualPrice: Number(newProduct.actualPrice),
                            tradePrice: Number(newProduct.tradePrice),
                        },
                    }
                );
        
                const quantityFilter = {
                    productName: newProduct.productName,
                    netWeight: newProduct.netWeight,
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

        // update depot product API
        app.patch('/depot-product/:id', async (req, res) => {
            const { id } = req.params;
            const updatedProduct = req.body;
        
            try {
                const existingProducts = await depotProductsCollections.find({
                    productName: updatedProduct.productName,
                    netWeight: updatedProduct.netWeight
                }).toArray();
        
                if (existingProducts.length > 0) {
                    await depotProductsCollections.updateMany(
                        { 
                            productName: updatedProduct.productName,
                            netWeight: updatedProduct.netWeight
                        },
                        {
                            $set: {
                                actualPrice: Number(updatedProduct.actualPrice),
                                tradePrice: Number(updatedProduct.tradePrice),
                            },
                        }
                    );
        
                    const filter = { 
                        productName: updatedProduct.productName,
                        netWeight: updatedProduct.netWeight,
                        batch: updatedProduct.batch,
                        expire: updatedProduct.expire,
                    };
        
                    const updatedQuantity = {
                        $set: { 
                            totalQuantity: Number(updatedProduct.totalQuantity),
                        },
                    };
        
                    const updatedQuantityResult = await depotProductsCollections.updateOne(filter, updatedQuantity);
        
                    if (Number(updatedProduct.totalQuantity) === 0) {
                        await depotProductsCollections.deleteOne(filter);
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
                            netWeight: updatedProduct.netWeight,
                            productCode: updatedProduct.productCode,
                            batch: updatedProduct.batch,
                            expire: updatedProduct.expire,
                            actualPrice: Number(updatedProduct.actualPrice),
                            tradePrice: Number(updatedProduct.tradePrice),
                            totalQuantity: Number(updatedProduct.totalQuantity),
                        },
                    };

                    const result = await depotProductsCollections.updateOne(filter, updateOperations, options);
        
                    if (Number(updatedProduct.totalQuantity) === 0) {
                        await depotProductsCollections.deleteOne(filter);
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
                    netWeight: newProduct.netWeight,
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
                const productDate = newProduct.date || new Date().toISOString().split('T')[0];

                const existingProduct = await depotExpiredCollections.findOne({
                    productName: newProduct.productName,
                    netWeight: newProduct.netWeight,
                    batch: newProduct.batch,
                    expire: newProduct.expire,
                    date: productDate
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
                    netWeight: newProduct.netWeight,
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
                    netWeight: newProduct.netWeight,
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

        // add new rider API
        app.post('/riders', async (req, res) => {
            try {
                const newRider = req.body;

                const count = await riderCollections.countDocuments({});
                const riderId = `DA${String(count + 1).padStart(3, '0')}`;

                newRider.riderId = riderId;
        
                const result = await riderCollections.insertOne(newRider);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Error adding rider", error });
            }
        });

        // get all riders API
        app.get('/riders', async(req, res) => {
            const result = await riderCollections.find().toArray();
            res.send(result);
        });

        // update rider(s) API
		app.patch('/rider/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const updatedRider = req.body;
                const filter = { _id: new ObjectId(id) };
                const options = { upsert: true };
        
                const updatedDoc = {
                    $set: {
                        ...updatedRider
                    }
                };
        
                const result = await riderCollections.updateOne(filter, updatedDoc, options);
                res.send(result);
            } catch (error) {
                res.status(500).json({ message: "Internal Server Error", error });
            }
        });

        // delete rider(s) API
        app.delete('/rider/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await riderCollections.deleteOne(query);
            res.send(result);
        });

        /******************** Order Section ********************/

        // add a new order API
        app.post('/orders', async (req, res) => {
            try {
                const newOrder = req.body;

                /* if (newOrder.status && newOrder.status.toLowerCase() !== 'pending') {
                    const today = new Date();
                    const day = String(today.getDate()).padStart(2, '0');
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const year = today.getFullYear();
                    const formattedDate = `${day}${month}${year}`;

                    const latestOrder = await orderCollections
                        .findOne({ invoice: { $regex: `^NPL${formattedDate}` } }, { sort: { invoice: -1 } });
        
                    let serialNumber = 1;
                    if (latestOrder) {
                        const latestInvoice = latestOrder.invoice;
                        serialNumber = parseInt(latestInvoice.slice(-6)) + 1;
                    }

                    const invoice = `NPL${formattedDate}INV${serialNumber.toString().padStart(6, '0')}`;

                    newOrder.invoice = invoice;
                } */

                if (newOrder.status && newOrder.status.toLowerCase() !== 'pending') {
                    const today = new Date();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const year = String(today.getFullYear()).slice(-2);
                    const prefix = `NPL${year}${month}`;

                    const latestOrder = await orderCollections.findOne(
                        { invoice: { $regex: `^${prefix}` } },
                        { sort: { invoice: -1 } }
                    );

                    let serialNumber = 1;
                    if (latestOrder && /^NPL\d{4}\d{4}$/.test(latestOrder.invoice)) {
                        const latestInvoice = latestOrder.invoice;
                        serialNumber = parseInt(latestInvoice.slice(-4)) + 1;
                    }

                    const invoice = `${prefix}${serialNumber.toString().padStart(4, '0')}`;
                    newOrder.invoice = invoice;
                }
                
                delete newOrder._id;

                const result = await orderCollections.insertOne(newOrder);
                res.send(result);
            } catch (error) {
                console.error('Error creating order:', error);
                res.status(500).send({ message: 'Failed to create order', error });
            }
        });

        // update order API
		app.patch('/order/:id', async (req, res) => {
			const id = req.params.id;
			const filter = { _id: new ObjectId(id) }
            const updatedOrder = req.body;
			const updateDoc = {
				$set: {
					...updatedOrder
				},
			};
			const result = await orderCollections.updateOne(filter, updateDoc);
			res.send(result);
		});

        // get all order(s) API
        app.get('/orders', async (req, res) => {
            const result = await orderCollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // delete pending order(s) API
        app.delete('/pending-order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await orderCollections.deleteOne(query);
            res.send(result);
        });

        /******************** Payment Section ********************/
        // add new payment API
        app.post('/payments', async (req, res) => {
            const newPayment = req.body;
          
            try {
              const paidDate = newPayment.paidDate || new Date().toISOString().split('T')[0];
          
              const existingProduct = await paymentCollections.findOne({
                invoice: newPayment.invoice,
                paidDate: paidDate,
              });
          
              if (existingProduct) {
                const updatedPaid = parseFloat(existingProduct.paid) + parseFloat(newPayment.paymentAmount);
                const updatedDue = parseFloat((existingProduct.totalPayable - updatedPaid).toFixed(2));
          
                const updatedProduct = await paymentCollections.updateOne(
                  { _id: existingProduct._id },
                  {
                    $set: {
                      paid: updatedPaid,
                      totalPayable: newPayment.totalPayable,
                      due: updatedDue,
                      status: updatedDue === 0 ? 'paid' : 'due',
                      deliveryMan: newPayment.deliveryMan,
                    },
                  }
                );
          
                res.send({ message: 'Payment updated successfully', updatedProduct });
              } else {
                newPayment.paidDate = paidDate;
                delete newPayment.paymentAmount;

                const result = await paymentCollections.insertOne(newPayment);
                res.send({ message: 'New payment record added', result });
              }
            } catch (error) {
              console.error('Error processing payment:', error);
              res.status(500).send({ message: 'Error processing payment', error });
            }
        });

        // get all payment(s) API
        app.get('/payments', async (req, res) => {
            const result = await paymentCollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        /******************** Return Section ********************/
        // send return(s) data API
		app.post('/returns', async (req, res) => {
			const newReturn = req.body;
			const result = await returnCollections.insertOne(newReturn);
			res.send(result);
		});

        // get all return(s) API
        app.get('/returns', async(req, res) => {
            const result = await returnCollections.find().toArray();
            res.send(result);
        });

        /******************** Expired Return Section ********************/
        // send expired return(s) data API
		app.post('/expired-returns', async (req, res) => {
			const newReturn = req.body;
			const result = await expiredReturnCollections.insertOne(newReturn);
			res.send(result);
		});

        // get all expired return(s) API
        app.get('/expired-returns', async(req, res) => {
            const result = await expiredReturnCollections.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // update expired return(s) status API
		app.patch('/expired-returns/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const updatedExReturnReq = req.body;
                const filter = { _id: new ObjectId(id) };
                const options = { upsert: true };
        
                const updatedDoc = {
                    $set: {
                        status: updatedExReturnReq.status,
                    }
                };
        
                const result = await expiredReturnCollections.updateOne(filter, updatedDoc, options);
                res.send(result);
            } catch (error) {
                res.status(500).json({ message: "Internal Server Error", error });
            }
        });

        // delete denied expired return(s) API
        app.delete('/expired-returns/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await expiredReturnCollections.deleteOne(query);
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