const config = {
    ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 5000,
    URL: process.env.BASE_URL || 'http://localhost:5000',
    MONGODB_URI: process.env.NODE_ENV || 'mongodb+srv://sergiuBodea77:mxck2577@myfirstcluster-6bvkx.mongodb.net/test?retryWrites=true&w=majority'
} 

export default config