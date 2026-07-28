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

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
    }
});

async function run() {
    try {
        await client.connect();

        const database = client.db("StartupForge_db");
        const opportunitiesCollection = database.collection("opportunities");
        const founderCollection = database.collection("founders");

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

        // app.get('/api/jobs', async (req, res) => {
        //     try {
        //         const { companyId, status, jobType, category, search, isRemote, page, perPage } = req.query; // req.query থেকে ডাটাগুলো ডিপ্রাক্ট করে নেওয়া হলো

        //         console.log('server side q', req.query);
        //         const query = {};

        //         // search related query
        //         if (search && search !== 'undefined' && search !== '') {
        //             query.$or = [
        //                 { title: { $regex: search, $options: 'i' } },
        //                 { companyName: { $regex: search, $options: 'i' } },
        //                 { category: { $regex: search, $options: 'i' } }
        //             ];
        //         }

        //         // jobType filter related query (undefined চেক সহ)
        //         if (jobType && jobType !== 'undefined' && jobType !== '') {
        //             query.type = jobType;
        //         }

        //         // category filter related query (undefined চেক সহ)
        //         if (category && category !== 'undefined' && category !== '') {
        //             query.category = category;
        //         }

        //         // isRemote filter
        //         if (isRemote === 'true') {
        //             query.isRemote = true;
        //         }

        //         // company related query
        //         if (companyId && companyId !== 'undefined') {
        //             query.companyId = companyId;
        //         }
        //         if (status && status !== 'undefined') {
        //             query.status = status;
        //         }

        //         // pagination related query
        //         if (page && page !== 'undefined') {
        //             const pageNumber = parseInt(page);
        //             const limitNumber = parseInt(perPage) || 12;
        //             const skipItems = (pageNumber - 1) * limitNumber;

        //             const total = await jobCollection.countDocuments(query);
        //             const cursor = jobCollection.find(query).skip(skipItems).limit(limitNumber);
        //             const jobs = await cursor.toArray();
        //             return res.json({ jobs, total });
        //         }

        //         const cursor = jobCollection.find(query);
        //         const result = await cursor.toArray();
        //         res.json(result);
        //     } catch (error) {
        //         console.error("Error fetching jobs:", error);
        //         res.status(500).json({ error: true, message: "Internal Server Error" });
        //     }
        // });


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


        app.post('/api/founders', async (req, res) => {
            try {
                const founder = req.body;
                const newFounder = {
                    ...founder,
                    createdAt: new Date(),
                }
                const result = await founderCollection.insertOne(newFounder);
                res.send(result);
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