// Import express module
const express = require('express');

// Import cors module
const cors = require('cors');

// Import mysql module
const mysql = require('mysql');
const multer = require('multer');
const path = require('path');

// Create express app
const app = express();

app.use(express.json());

app.use(express.static('public'));

// cors middleware
app.use(cors());

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, '../ecommercewebsite/public/images')
    },
    filename: (req, file, cb) => {
        // filename = file name + date + extension of uploaded file
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname))
    }
})


const upload = multer({
    storage: storage
})

// Create MySQL database connection 
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "ecommercewebsite"
})

// Endpoint to fetch all products to home screen
app.get('/', (req, res) => {

    const sql = "SELECT * FROM products";

    db.query(sql, (err, data) => {
        if (err) return res.json("Error...");
        return res.json(data);
    })
});

// Endpoint to fetch all products in cart
app.get('/cart', (req, res) => {

    const sql = "SELECT cart.prodID, products.id, products.prodName, products.prodPrice, products.prodImage, cart.prodQty FROM cart JOIN products ON cart.prodID = products.id";

    db.query(sql, (err, data) => {
        if (err) return res.status(500).json("Error...");
        return res.json(data);
    })
});

// Endpoint to add products to cart from home
app.post('/addtocart/:prodId', (req, res) => {
    const { prodId } = req.params;

    // Check if the product already exists in cart
    const checkIfExistsQuery = "SELECT * FROM cart WHERE prodID = ?";

    db.query(checkIfExistsQuery, [prodId], (err, result) => {
        if (err) return res.status(500).json("Error checking cart.");

        if (result.length > 0) {
            // If product exists, increase quantity by 1
            const updateQuantityQuery = "UPDATE cart SET prodQty = prodQty + 1 WHERE prodID = ?";
            db.query(updateQuantityQuery, [prodId], (err, updateResult) => {
                if (err) return res.status(500).json("Error updating quantity.");
                return res.status(200).json("Quantity updated successfully.");
            });
        } else {
            // If product doesn't exist, insert new entry with quantity 1
            const insertQuery = "INSERT INTO cart (prodID, prodQty) VALUES (?, ?)";
            db.query(insertQuery, [prodId, 1], (err, insertResult) => {
                if (err) return res.status(500).json("Error adding to cart.");
                return res.status(200).json("Product added to cart successfully.");
            });
        }
    });
});

// Endpoint to delete from cart
app.delete('/deletecart/:id', (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM cart WHERE prodID=?";

    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json("Error...");
        return res.status(200).json("Product deleted successfully");
    });
});

// Endpoint to verify user login credentials
app.post('/login/:username&:password', (req, res) => {
    const { username, password } = req.params;

    const sql = "SELECT * FROM user_login WHERE username = ? AND password = ?";

    db.query(sql, [username, password], (err, result) => {
        //error 500
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Server Error" });
        }

        //success 200
        if (result.length > 0) {
            return res.status(200).json({ message: "Login successful" });
        }
        //error 401
        else {
            return res.status(401).json({ error: "Invalid username or password" });
        }
    });
});

// Endpoint to verify admin login credentials
app.post('/adminlogin/:username&:password', (req, res) => {
    const { username, password } = req.params;

    const sql = "SELECT * FROM admin_login WHERE username = ? AND password = ?";

    db.query(sql, [username, password], (err, result) => {
        if (err) {
            //error 500
            console.log(err);
            return res.status(500).json({ error: "Server Error" });
        }

        //success 200
        if (result.length > 0) {
            return res.status(200).json({ message: "Login successful" });
        }
        //error 401
        else {
            return res.status(401).json({ error: "Invalid username or password" });
        }
    });
});

// Endpoint to add products
app.post('/addproduct', upload.single('prodImage'), (req, res) => {

    const { prodName, prodPrice, prodDescription } = req.body;
    const prodImage = req.file.filename;

    console.log("Product Name: " + prodName);
    console.log("Product Price: " + prodPrice);
    console.log("Product Description: " + prodDescription);
    console.log("Product Image File: " + prodImage);

    const sql = "INSERT INTO products (prodName, prodPrice, prodImage, prodDescription) VALUES (?, ?, ?, ?)";

    db.query(sql, [prodName, prodPrice, prodImage, prodDescription], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json("Error adding product to the database.");
        }
        return res.status(200).json("Product added successfully to the database.");
    });
});

// Endpoint to update products
app.post('/updateproduct', (req, res) => {

    const { updateId, updateName, updatePrice, updateDescription } = req.body;
    console.log("/updateproduct");
    console.log("Update Id: " + updateId);
    console.log("Update Name: " + updateName);
    console.log("Update Price: " + updatePrice);
    console.log("Update Description: " + updateDescription);

    const sql = "UPDATE products SET prodName = ?, prodPrice = ?, prodDescription = ? WHERE id = ?";

    db.query(sql, [updateName, updatePrice, updateDescription, updateId], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json("Error updating product in the database.");
        }
        return res.status(200).json("Product updated successfully in the database.");
    });
});


// Endpoint to delete from crud
app.delete('/crud-delete/:id', (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM products WHERE id=?";

    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json("Error...");
        return res.status(200).json("Product deleted successfully");
    });
});

// Endpoint to update quantity minus
app.post('/updatecartqty/minus/:id', (req, res) => {
    const { id } = req.params;

    // Check if the product already exists in cart
    const getProdQuantityQuery = "SELECT prodQty FROM cart WHERE prodID = ?";

    db.query(getProdQuantityQuery, [id], (err, result) => {
        if (err) return res.status(500).json("Error getting quantity.");

        const currentQuantity = result[0].prodQty;

        // check prodQty > 1
        if (currentQuantity > 1) {
            const newQuantity = currentQuantity - 1;

            // Update quantity in the cart
            const updateQuantityQuery = "UPDATE cart SET prodQty = ? WHERE prodID = ?";
            db.query(updateQuantityQuery, [newQuantity, id], (err, updateResult) => {
                if (err) return res.status(500).json("Error updating quantity.");
                return res.status(200).json("Quantity updated successfully.");
            });
        } else {
            return res.status(400).json("Quantity cannot be less than 1.");
        }
    });
});

// Endpoint to update quantity plus
app.post('/updatecartqty/plus/:id', (req, res) => {
    const { id } = req.params;

    // Check if the product already exists in cart
    const getProdQuantityQuery = "SELECT prodQty FROM cart WHERE prodID = ?";

    db.query(getProdQuantityQuery, [id], (err, result) => {
        if (err) return res.status(500).json("Error getting quantity.");

        const currentQuantity = result[0].prodQty;

        const newQuantity = currentQuantity + 1;

        // Update quantity in the cart
        const updateQuantityQuery = "UPDATE cart SET prodQty = ? WHERE prodID = ?";
        db.query(updateQuantityQuery, [newQuantity, id], (err, updateResult) => {
            if (err) return res.status(500).json("Error updating quantity.");
            return res.status(200).json("Quantity updated successfully.");
        });

    });
});


// Endpoint to add users
app.post('/signup/:username&:password', (req, res) => {

    const { username, password } = req.params;

    console.log("username: " + username);
    console.log("password: " + password);

    const sql = "INSERT INTO user_login (username, password) VALUES (?, ?)";

    db.query(sql, [username, password], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json("Error adding user to the database.");
        }
        return res.status(200).json("New user added successfully to the database.");
    });
});

// Start server
app.listen(8080, () => {
    console.log("server listening on: http://localhost:8080");
});