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
        const bookmarkCollection = database.collection('bookmarks');

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

            const query = { token };
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

        // verify token (Updated)
        // const verifyToken = async (req, res, next) => {
        //     let token = null;

        //     // ১. প্রথমে হেডার থেকে টোকেন খোঁজার চেষ্টা করবে
        //     const authHeader = req.headers?.authorization;
        //     if (authHeader && authHeader.startsWith('Bearer ')) {
        //         token = authHeader.split(' ')[1];
        //     }

        //     // ২. হেডার না পেলে রিকোয়েস্টের কুকি বা কুয়েরি থেকে টোকেন খোঁজার ব্যাকআপ ব্যবস্থা
        //     if (!token && req.headers?.cookie) {
        //         // কুকি স্ট্রিং থেকে better-auth.session_token বা সাধারণ token বের করা
        //         const cookies = req.headers.cookie.split(';');
        //         for (let cookie of cookies) {
        //             const [key, value] = cookie.trim().split('=');
        //             if (key === 'better-auth.session_token' || key === 'token') {
        //                 token = value;
        //                 break;
        //             }
        //         }
        //     }

        //     if (!token) {
        //         return res.status(401).json({ error: true, message: "Unauthorized: No token provided" });
        //     }

        //     const query = { token };
        //     const session = await sessionCollection.findOne(query);
        //     if (!session) {
        //         return res.status(401).json({ error: true, message: "Invalid session" });
        //     }

        //     const userId = session.userId;
        //     const userQurey = { _id: userId };

        //     const user = await userCollection.findOne(userQurey);
        //     if (!user) {
        //         return res.status(401).json({ error: true, message: "Invalid user" });
        //     }

        //     // req অবজেক্টে ইউজার এবং রোল সেট করে দেওয়া
        //     req.user = user;
        //     next();
        // }
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

        // user relevant API
        app.get('/api/user', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const user = await userCollection.find();
                const result = await user.toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching user:", error);
                res.status(500).json({ error: true, message: "Internal Server Error" });
            }
        });

        app.patch('/api/user/:id/role', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const userId = req.params.id;
                const { role } = req.body;

                if (!role) {
                    return res.status(400).json({
                        success: false,
                        message: "Role is required"
                    });
                }

                if (!ObjectId.isValid(userId)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid user ID"
                    });
                }

                const query = {
                    _id: new ObjectId(userId)
                };

                const updateDoc = {
                    $set: {
                        role,
                        updatedAt: new Date()
                    }
                };

                const result = await userCollection.updateOne(
                    query,
                    updateDoc
                );

                if (result.matchedCount === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "User not found"
                    });
                }

                res.json({
                    success: true,
                    message: "User role updated successfully",
                    result
                });

            } catch (error) {
                console.error("Error updating user role:", error);

                res.status(500).json({
                    error: true,
                    message: "Internal Server Error"
                });
            }
        });

        app.delete('/api/user/:id', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const userId = req.params.id;

                if (!ObjectId.isValid(userId)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid user ID"
                    });
                }

                const result = await userCollection.deleteOne({
                    _id: new ObjectId(userId)
                });

                if (result.deletedCount === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "User not found"
                    });
                }

                res.json({
                    success: true,
                    message: "User deleted successfully",
                    result
                });

            } catch (error) {
                console.error("Error deleting user:", error);

                res.status(500).json({
                    error: true,
                    message: "Internal Server Error"
                });
            }
        });

        // opportunities relevant API
        app.get('/api/opportunities', async (req, res) => {
            try {
                const query = {};

                if (req.query.founderId) {
                    query.founderId = req.query.founderId;
                }
                if (req.query.status) {
                    query.status = req.query.status;
                }

                // Category ফিল্টার
                if (req.query.category && req.query.category !== 'all') {
                    query.category = req.query.category;
                }

                // Type ফিল্টার
                if (req.query.type && req.query.type !== 'all-types') {
                    query.type = req.query.type;
                }

                // Remote ফিল্টার (boolean রূপান্তর নিশ্চিত করা)
                if (req.query.isRemote === 'true' || req.query.isRemote === true) {
                    query.location = { $regex: 'remote', $options: 'i' };
                }

                // Search ফিল্টার
                if (req.query.search) {
                    const searchRegex = new RegExp(req.query.search, 'i');
                    query.$or = [
                        { roleTitle: searchRegex },
                        { startupName: searchRegex },
                        { description: searchRegex }
                    ];
                }

                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 12;
                const skip = (page - 1) * limit;

                // ⚠️ মূল ঠিক করার জায়গা: countDocuments(query) এ ফিল্টার অবজেক্ট পাস করতে হবে
                const total = await opportunitiesCollection.countDocuments(query);

                // নির্দিষ্ট পেজ ও লিমি트 অনুযায়ী ডাটা আনা
                const cursor = opportunitiesCollection.find(query).skip(skip).limit(limit);
                const opportunities = await cursor.toArray();

                let userBookmarks = [];
                const authHeader = req.headers?.authorization;
                if (authHeader) {
                    try {
                        const token = authHeader.split(' ')[1];
                        if (token) {
                            const session = await sessionCollection.findOne({ token });
                            if (session) {
                                const userId = session.userId;
                                const userIdObj = new ObjectId(userId);
                                const userIdStr = userId.toString();

                                const bookmarks = await bookmarkCollection.find({
                                    userId: { $in: [userIdObj, userIdStr] }
                                }).toArray();

                                userBookmarks = bookmarks.map(b => b.opportunityId.toString());
                            }
                        }
                    } catch (err) {
                        console.error("Optional auth/bookmark check error:", err);
                    }
                }

                const result = opportunities.map(opp => ({
                    ...opp,
                    isBookmarked: userBookmarks.includes(opp._id.toString())
                }));

                res.json({
                    opportunities: result,
                    total
                });
            }
            catch (error) {
                console.error("Error fetching opportunities:", error);
                res.status(500).json({ error: true, message: "Internal Server Error" });
            }
        });

        app.get('/api/opportunities/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await opportunitiesCollection.findOne(query);
            res.send(result);
        });

        app.post('/api/opportunities', verifyToken, verifyFounder, async (req, res) => {
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

        app.delete('/api/opportunities/:id', logger, verifyToken, verifyFounder, async (req, res) => {
            try {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const result = await opportunitiesCollection.deleteOne(filter);
                res.send(result);
            } catch (error) {
                console.error("Database Delete Error:", error);
                res.status(500).json({ error: true, message: "Database connection failed" });
            }
        });

        // applications relevant API
        app.post('/api/applications', verifyToken, verifyCollaborator, async (req, res) => {
            try {
                const application = req.body;
                const userId = req.user?.id || req.user?._id;

                if (!userId) {
                    return res.status(401).json({ error: true, message: "Unauthorized user" });
                }
                const newApplication = {
                    ...application,
                    applicantId: userId.toString(),
                    applicantEmail: req.user.email,
                    createdAt: new Date(),
                }
                const result = await applicationCollection.insertOne(newApplication);
                res.send(result);
            } catch (error) {
                console.error("Database Insert Error:", error);
                res.status(500).json({ error: true, message: "Database connection failed" });
            }
        });

        app.get('/api/applications', verifyToken, async (req, res) => {
            try {
                const query = {};

                if (req.query.applicantId) {
                    if (req.user._id.toString() !== req.query.applicantId) {
                        return res.status(401).json({ error: true, message: "Unauthorized" });
                    }
                    query.applicantId = req.query.applicantId;
                }

                if (req.query.opportunityId) {
                    query.opportunityId = req.query.opportunityId;
                }

                // নতুন যোগ করা হলো: startupName দিয়ে ফিল্টার করার জন্য
                if (req.query.startupName) {
                    query.startupName = req.query.startupName;
                }

                console.log("Application Query:", query);

                const cursor = applicationCollection.find(query);
                const result = await cursor.toArray();

                console.log("Applications Found:", result);

                res.send(result);

            } catch (error) {
                console.error("Get Applications Error:", error);

                res.status(500).json({
                    error: true,
                    message: "Failed to fetch applications"
                });
            }
        });

        app.delete('/api/applications/:id', logger, verifyToken, async (req, res) => {
            try {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const result = await applicationCollection.deleteOne(filter);
                res.send(result);
            } catch (error) {
                console.error("Database Delete Error:", error);
                res.status(500).json({ error: true, message: "Database connection failed" });
            }
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

        app.post('/api/startups', verifyToken, verifyFounder, async (req, res) => {
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


        app.patch('/api/startups/:id', logger, verifyToken, async (req, res) => {
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
            console.log('plan', plan)
        })

        // subscriptions
        app.post('/api/subscriptions', verifyToken, async (req, res) => {
            try {
                const data = req.body;
                const subsInfo = {
                    ...data,
                    createdAt: new Date(),
                }
                const result = await subscriptionCollection.insertOne(subsInfo);

                // Update the user plan information
                const filter = { email: { $regex: new RegExp(`^${data.email}$`, "i") } };
                // update the plan field
                const updateDocument = { $set: { plan: data.plan } };

                const updateResult = await userCollection.updateOne(filter, updateDocument);
                console.log("User Plan Update Result:", updateResult);
                res.send(updateResult);
            } catch (error) {
                console.error("Database Insert Error:", error);
                res.status(500).json({ error: true, message: "Database connection failed" });
            }
        });

        app.get('/api/subscriptions', verifyToken, async (req, res) => {
            try {
                const query = {};
                if (req.query.email) {
                    query.email = req.query.email;
                }

                // subscriptionCollection থেকে ডেটা খোঁজা
                const subscriptions = await subscriptionCollection.find(query).toArray();
                res.json(subscriptions);
            } catch (error) {
                console.error("Error fetching subscriptions:", error);
                res.status(500).json({ error: true, message: "Internal Server Error" });
            }
        });

        // bookmarks relevant API
        app.post('/api/bookmarks', logger, verifyToken, verifyCollaborator, async (req, res) => {
            try {
                const { opportunityId, opportunityTitle, startupName } = req.body;

                if (!opportunityId) {
                    return res.status(400).json({
                        error: true,
                        message: "Opportunity ID is required",
                    });
                }

                // একই opportunity আগে bookmark করা হয়েছে কিনা
                const existingBookmark = await bookmarkCollection.findOne({
                    userId: req.user._id,
                    opportunityId: opportunityId,
                });

                if (existingBookmark) {
                    return res.status(409).json({
                        error: true,
                        message: "Opportunity already bookmarked",
                    });
                }

                const newBookmark = {
                    userId: req.user._id,
                    opportunityId,
                    opportunityTitle,
                    startupName,
                    createdAt: new Date(),
                };

                const result = await bookmarkCollection.insertOne(newBookmark);

                res.status(201).send({
                    success: true,
                    message: "Bookmark saved successfully",
                    bookmarkId: result.insertedId,
                });

            } catch (error) {
                console.error("Bookmark Insert Error:", error);

                res.status(500).json({
                    error: true,
                    message: "Database connection failed",
                });
            }
        }
        );

        app.delete('/api/bookmarks/:opportunityId', logger, verifyToken, verifyCollaborator, async (req, res) => {
            try {
                const { opportunityId } = req.params;

                const filter = {
                    userId: req.user._id,
                    opportunityId: opportunityId,
                };

                const result = await bookmarkCollection.deleteOne(filter);

                if (result.deletedCount === 0) {
                    return res.status(404).json({
                        error: true,
                        message: "Bookmark not found",
                    });
                }

                res.send({
                    success: true,
                    message: "Bookmark removed successfully",
                });

            } catch (error) {
                console.error("Bookmark Delete Error:", error);

                res.status(500).json({
                    error: true,
                    message: "Database connection failed",
                });
            }
        }
        );

        app.get('/api/bookmarks', logger, verifyToken, verifyCollaborator, async (req, res) => {
            try {
                // ইউজার আইডি দিয়ে কুয়েরি শুরু করা হলো যাতে শুধু এই ইউজারের বুকমার্কগুলোই আসে
                const query = { userId: req.user._id };

                if (req.query.opportunityId) {
                    query.opportunityId = req.query.opportunityId;
                }

                const cursor = bookmarkCollection.find(query);
                const result = await cursor.toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching bookmarks:", error);
                res.status(500).json({ error: true, message: "Internal Server Error" });
            }
        });

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
// module.exports = app;