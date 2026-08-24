const express = require('express');
require('dotenv').config()
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = 5000

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World!')
})

const logger = (req, res, next) => {
    console.log('logger middleware logged', req.params);
    next();
};


const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
    }
});

async function run() {
    try {
        await client.connect();

        // client.connect(() => {
        //     console.log("🚀 MongoDB Connected");
        // }).catch(console.dir);

        const database = client.db("StartupForge_db");
        const opportunitiesCollection = database.collection("opportunities");
        const startupCollection = database.collection("startups");
        const userCollection = database.collection("user");
        const applicationCollection = database.collection("applications");
        const planCollection = database.collection('plans');
        const subscriptionCollection = database.collection('subscriptions');
        const sessionCollection = database.collection('session');

        // verify token
        const verifyToken = async (req, res, next) => {
            // console.log('header', req.headers);
            const authHeader = req.headers?.authorization;
            if (!authHeader) {
                return res.status(401).json({ error: true, message: "Unauthorized" });
            }
            const token = authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({ error: true, message: "Unauthorized" });
            }

            query = { token: token };
            const session = await sessionCollection.findOne(query);
            if (!session) {
                return res.status(401).json({ error: true, message: "Invalid user" });
            }

            const userId = session.userId;
            const userQurey = { _id: userId };

            const user = await userCollection.findOne(userQurey);
            if (!user) {
                return res.status(401).json({ error: true, message: "Invalid user" });
            }
            // set data in req object
            req.user = user;
            next();
        }
        // verify token middleware
        const verifyCollaborator = async (req, res, next) => {
            if (req.user?.role !== 'collaborator') {
                return res.status(401).json({ error: true, message: "Unauthorized" });
            }
            next();
        }

        const verifyFounder = async (req, res, next) => {
            if (req.user?.role !== 'founder') {
                return res.status(401).json({ error: true, message: "Unauthorized" });
            }
            next();
        }

        const verifyAdmin = async (req, res, next) => {
            if (req.user?.role !== 'admin') {
                return res.status(401).json({ error: true, message: "Unauthorized" });
            }
            // console.log('admin', req.user);
            next();
        }


        // app.get('/api/user', async (req, res) => {
        //     try {
        //         const user = await userCollection.find();
        //         const result = await user.toArray();
        //         res.send(result);
        //     } catch (error) {
        //         console.error("Error fetching user:", error);
        //         res.status(500).json({ error: true, message: "Internal Server Error" });
        //     }
        // });

        app.get('/api/opportunities', async (req, res) => {
            try {
                const query = {};
                if (req.query.founderId) {
                    query.founderId = req.query.founderId;
                }
                if (req.query.status) {
                    query.status = req.query.status;
                }
                const cursor = opportunitiesCollection.find(query);
                const result = await cursor.toArray();
                res.json(result);
            }
            catch (error) {
                console.error("Error fetching opportunities:", error);
                res.status(500).json({ error: true, message: "Internal Server Error" });
            }
        });
        app.get('/api/opportunities/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await opportunitiesCollection.findOne(query);
            res.send(result);
        });

        app.patch('/api/opportunities/:id', logger, verifyToken, verifyFounder, async (req, res) => {
            try {
                const id = req.params.id;
                const updatedOpportunity = req.body;
                const filter = { _id: new ObjectId(id) };

                const updateDoc = {
                    $set: updatedOpportunity,
                    // পুরনো ফিল্ডগুলো ডেটাবেজ থেকে মুছে ফেলার জন্য $unset ব্যবহার করা হলো
                    $unset: {
                        workType: "",
                        commitmentLevel: ""
                    }
                };
                const result = await opportunitiesCollection.updateOne(filter, updateDoc);
                res.send(result);
            } catch (error) {
                console.error("Database Insert Error:", error);
                res.status(500).json({ error: true, message: "Database connection failed" });
            }
        });

        app.post('/api/opportunities', async (req, res) => {
            try {
                const opportunity = req.body;
                const newOpportunity = {
                    ...opportunity, createdAt: new Date()
                }
                const result = await opportunitiesCollection.insertOne(newOpportunity);
                // ফ্রন্টএন্ডে পিওর JSON অবজেক্ট পাঠানোর জন্য res.json ব্যবহার করুন
                res.json(result);
            } catch (error) {
                console.error("Database Insert Error:", error);
                res.status(500).json({ error: true, message: "Database connection failed" });
            }
        });

        // applications relevant API
        app.post('/api/applications', async (req, res) => {
            try {
                const application = req.body;
                const newApplication = {
                    ...application,
                    createdAt: new Date(),
                }
                const result = await applicationCollection.insertOne(newApplication);
                res.send(result);
            } catch (error) {
                console.error("Database Insert Error:", error);
                res.status(500).json({ error: true, message: "Database connection failed" });
            }
        });

        app.get('/api/applications', verifyToken, verifyCollaborator, async (req, res) => {
            const query = {};
            if (req.query.opportunityId) {
                query.opportunityId = req.query.opportunityId;

                if (req.user._id.toString() !== req.query.opportunityId) {
                    return res.status(401).json({ error: true, message: "Unauthorized" });
                }
            }
            if (req.query.opportunityId) {
                query.opportunityId = req.query.opportunityId;
            }
            const cursor = applicationCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });


        // startups relevant API
        // app.get('/api/startups', async (req, res) => {
        //     const cursor = startupCollection.find();
        //     const result = await cursor.toArray();
        //     res.send(result);
        // })

        app.get('/api/startups', verifyToken, async (req, res) => {
            const cursor = startupCollection.find();
            const startups = await cursor.toArray();

            for (const startup of startups) {
                const filter = {
                    startupId: startup._id.toString()
                }
                const opportunityCount = await opportunitiesCollection.countDocuments(filter);
                startup.opportunityCount = opportunityCount;
            }

            res.send(startups);
        })

        app.get('/api/my/startups', async (req, res) => {
            try {
                const query = {};
                if (req.query.founderId) {
                    query.founderId = req.query.founderId;
                }
                if (req.query.founderId) {
                    query.founderId = req.query.founderId;
                }
                console.log("🎯 [Backend Querying]:", query);

                const result = await startupCollection.find(query).toArray();

                console.log("📦 [Backend Result Found]:", result);
                res.json(result);

            } catch (error) {
                // ব্যাকএন্ড টার্মিনালে আসল এররটি প্রিন্ট হবে
                console.error("❌ MongoDB Fetch Error in /api/my/startups:", error);

                // ফ্রন্টএন্ডের ক্র্যাশ ঠেকাতে একটা প্রোপার JSON এরর রেসপন্স পাঠানো হচ্ছে
                res.status(500).json({ error: true, message: error.message, data: [] });
            }
        });

        app.post('/api/startups', async (req, res) => {
            try {
                const startup = req.body;
                const newStartupData = {
                    ...startup,
                    createdAt: new Date(),
                }
                const result = await startupCollection.insertOne(newStartupData);
                res.send(result);
            } catch (error) {
                console.error("Database Insert Error:", error);
                res.status(500).json({ error: true, message: "Database connection failed" });
            }
        });


        app.patch('/api/startups/:id', logger, verifyToken, verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const updatedStartup = req.body;
                const filter = { _id: new ObjectId(id) };

                const updateDoc = {
                    $set: {
                        isApproved: updatedStartup.isApproved,
                    }
                };
                const result = await startupCollection.updateOne(filter, updateDoc);
                res.send(result);
            } catch (error) {
                console.error("Database Insert Error:", error);
                res.status(500).json({ error: true, message: "Database connection failed" });
            }
        });


        //plans
        app.get('/api/plans', async (req, res) => {
            const query = {}
            if (req.query.plan_id) {
                query.id = req.query.plan_id
            }
            const plan = await planCollection.findOne(query)
            res.json(plan)
        })

        // subscriptions
        app.post('/api/subscriptions', async (req, res) => {
            try {
                const data = req.body;
                const subsInfo = {
                    ...data,
                    createdAt: new Date(),
                }
                const result = await subscriptionCollection.insertOne(subsInfo);

                // Update the user plan information
                const filter = { email: data.email };
                // update the plan field
                const updateDocument = { $set: { plan: data.planId } };

                const updateResult = await userCollection.updateOne(filter, updateDocument);
                res.send(updateResult);
            } catch (error) {
                console.error("Database Insert Error:", error);
                res.status(500).json({ error: true, message: "Database connection failed" });
            }
        });


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
// module.exports = app;