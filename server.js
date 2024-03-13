const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
const saltRounds = 10;

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "signup",
});

function queryAsync(sql, values) {
  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}

app.post("/signup", async (req, res) => {
  try {
    const { name, email, number, password } = req.body;
    const checkEmailQuery = "SELECT * FROM login WHERE email = ?";
    const results = await queryAsync(checkEmailQuery, [email]);

    if (results.length > 0) {
      return res.json("Email already exists. Go to the login page.");
    }

    const passwordHash = await bcrypt.hash(password, saltRounds);
    const insertQuery =
      "INSERT INTO login (name, email, number, password) VALUES (?, ?, ?, ?)";
    const values = [name, email, number, passwordHash];
    await queryAsync(insertQuery, values);

    return res.json("SIGNUP SUCCESSFUL");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal Server Error");
  }
});

app.post("/ownersignup", async (req, res) => {
  try {
    const { name, storename, email, number, password } = req.body;
    const checkEmailQuery = "SELECT * FROM ownerlogin WHERE email = ?";
    const results = await queryAsync(checkEmailQuery, [email]);

    if (results.length > 0) {
      return res.json("Email already exists. Go to the login page.");
    }

    const passwordHash = await bcrypt.hash(password, saltRounds);
    const insertQuery =
      "INSERT INTO ownerlogin (name, storename, email, number, password) VALUES (?, ?, ?, ?, ?)";
    const values = [name, storename, email, number, passwordHash];
    await queryAsync(insertQuery, values);

    return res.json("SIGNUP SUCCESSFUL");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal Server Error");
  }
});

let username = "";
let useremail = "";
app.post("/login", async (req, res) => {
  try {
    const data = req.body;

    let results = await queryAsync("SELECT * FROM login WHERE email = ?", [
      data.emailOrPhone,
    ]);
    results = JSON.parse(JSON.stringify(results));
    console.log(results);
    if (results.length > 0) {
      const storedPasswordHash = results[0].password;
      console.log("Entered Password:", data.password);
      console.log("Stored Password Hash:", storedPasswordHash);

      const passwordMatch = await bcrypt.compare(
        data.password,
        storedPasswordHash
      );
      console.log("Password Match:", passwordMatch);

      if (passwordMatch) {
        const { name } = results[0];
        useremail = results[0].email;

        console.log("LOGIN SUCCESSFUL");
        console.log("Response Data:", results[0]);
        console.log("Name:", name);
        return res.json({
          message: "LOGIN SUCCESSFUL",
          name: name,
          email: useremail,
        });
      } else {
        console.log("Invalid email or password");
        return res.status(400).json("Invalid email or password");
      }
    } else {
      console.log("Invalid email or password");
      return res.status(400).json("Invalid email or password");
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal Server Error");
  }
});

app.post("/ownerlogin", async (req, res) => {
  try {
    const data = req.body;

    let results = await queryAsync("SELECT * FROM ownerlogin WHERE email = ?", [
      data.emailOrPhone,
    ]);
    results = JSON.parse(JSON.stringify(results));
    console.log(results);
    if (results.length > 0) {
      const storedPasswordHash = results[0].password;

      console.log("Entered Password:", data.password);
      console.log("Stored Password Hash:", storedPasswordHash);

      const passwordMatch = await bcrypt.compare(
        data.password,
        storedPasswordHash
      );

      console.log("Password Match:", passwordMatch);

      if (passwordMatch) {
        const userName = results[0].name;
        console.log("LOGIN SUCCESSFUL");
        return res.json("LOGIN SUCCESSFUL");
        return res.json({ message: "Login Success", name: userName });
      } else {
        console.log("Invalid email or password");
        return res.status(400).json("Invalid email or password");
      }
    } else {
      console.log("Invalid email or password");
      return res.status(400).json("Invalid email or password");
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal Server Error");
  }
});

app.post("/addtocart", (req, res) => {
  const { productname, image, price, quantity } = req.body;
  const email = useremail;
  const checkIfExistsQuery =
    "SELECT * FROM addtocart WHERE productname = ? AND useremail = ?";
  db.query(checkIfExistsQuery, [productname, email], (err, results) => {
    if (err) {
      console.error("Error checking if item exists in cart:", err);
      return res.status(500).json("Internal Server Error");
    }

    if (results.length > 0) {
      const existingItem = results[0];
      const updatedQuantity = existingItem.quantity + 1;
      const updatedPrice = price * updatedQuantity;
      const updateQuantityQuery =
        "UPDATE addtocart SET quantity = ?, price = ? WHERE productname = ? AND useremail = ?";
      db.query(
        updateQuantityQuery,
        [updatedQuantity, updatedPrice, productname, email],
        (err, result) => {
          if (err) {
            console.error("Error updating quantity and price in cart:", err);
            return res.status(500).json("Internal Server Error");
          }
          console.log("Quantity and price updated successfully in cart");
          return res.json("Quantity and price updated in cart");
        }
      );
    } else {
      const insertQuery =
        "INSERT INTO addtocart (useremail, productname, image, price, quantity) VALUES (?, ?, ?, ?, ?)";
      const values = [email, productname, image, price, 1];
      db.query(insertQuery, values, (err, result) => {
        if (err) {
          console.error("Error adding item to cart:", err);
          return res.status(500).json("Internal Server Error");
        }
        console.log("Item added to cart successfully");
        return res.json("Item added to cart");
      });
    }
  });
});

app.post("/increasequantity", (req, res) => {
  const { productname } = req.body;

  const getCartItemQuery =
    "SELECT quantity FROM addtocart WHERE productname = ?";
  db.query(getCartItemQuery, [productname], (err, results) => {
    if (err) {
      console.error("Error fetching cart item:", err);
      return res.status(500).json("Internal Server Error");
    }

    if (results.length === 0) {
      return res.status(404).json("Product not found in cart");
    }
    const { quantity } = results[0];
    let prices = [];
    const tables = [
      "acanteendata",
      "amuldata",
      "bakerydata",
      "centralsquaredata",
      "chittidlidata",
      "dosacornerdata",
      "juicestalldata",
      "kathiesdata",
      "nightcafeteriadata",
      "softysdata",
      "templesquaredata",
      "yummidata",
    ];
    tables.forEach((table) => {
      const getPriceQuery = `SELECT price FROM ${table} WHERE name = ?`;
      db.query(getPriceQuery, [productname], (err, results) => {
        if (err) {
          console.error(`Error fetching price from ${table}:`, err);
          return res.status(500).json("Internal Server Error");
        }

        if (results.length !== 0) {
          prices.push(results[0].price);
        }
      });
    });

    setTimeout(() => {
      if (prices.length === 0) {
        return res.status(404).json("Product not found in any table");
      }

      const price = Math.max(...prices);

      const updatedQuantity = quantity + 1;
      const updatedPrice = price * updatedQuantity;

      const updateQuantityQuery =
        "UPDATE addtocart SET quantity = ?, price = ? WHERE productname = ?";
      db.query(
        updateQuantityQuery,
        [updatedQuantity, updatedPrice, productname],
        (err, result) => {
          if (err) {
            console.error("Error updating quantity and price in cart:", err);
            return res.status(500).json("Internal Server Error");
          }
          console.log("Quantity and price updated successfully in cart");

          return res.json({ updatedQuantity, updatedPrice });
        }
      );
    }, 100);
  });
});

app.post("/decreasequantity", (req, res) => {
  const { productname } = req.body;

  const fetchCurrentDataQuery =
    "SELECT quantity, price FROM addtocart WHERE productname = ?";
  db.query(fetchCurrentDataQuery, [productname], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json("Internal Server Error");
    }

    const currentQuantity = result[0].quantity;
    const price = result[0].price;

    if (currentQuantity <= 1) {
      const deleteQuery = "DELETE FROM addtocart WHERE productname = ?";
      db.query(deleteQuery, [productname], (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json("Internal Server Error");
        }
        console.log("Item removed from cart");
        return res.json("Item removed from cart");
      });
    } else {
      const updatedQuantity = currentQuantity - 1;

      const originalPricePerItem = price / currentQuantity;
      const updatedPrice = originalPricePerItem * updatedQuantity;

      const updateQuery =
        "UPDATE addtocart SET quantity = ?, price = ? WHERE productname = ?";
      db.query(
        updateQuery,
        [updatedQuantity, updatedPrice, productname],
        (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).json("Internal Server Error");
          }
          console.log("Quantity and price decreased successfully");
          return res.json("Quantity and price decreased in cart");
        }
      );
    }
  });
});

app.get("/grandtotal", (req, res) => {
  const email = useremail;
  const query =
    "SELECT SUM(price) AS grandTotal FROM addtocart WHERE useremail = ?";
  db.query(query, [email], (err, result) => {
    if (err) {
      console.error("Error calculating grand total:", err);
      return res.status(500).json("Internal Server Error");
    }
    const grandTotal = result[0].grandTotal || 0;
    return res.json({ grandTotal });
  });
});

app.post("/empty", async (req, res) => {
  try {
    console.log("email:", req.body.userEmail);
    const emptyCartQuery = "DELETE FROM addtocart WHERE useremail = ?";
    await queryAsync(emptyCartQuery, [useremail]);
    return res.json("Cart emptied successfully");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal Server Error");
  }
});

app.post("/deletestore", (req, res) => {
  const { storeName } = req.body;
  const deleteQuery = "DELETE FROM stores WHERE storename = ?";
  db.query(deleteQuery, [storeName], (err, result) => {
    if (err) {
      console.error(err);
      return res.json("error");
    }
    return res.json("success");
  });
});

app.get("/stores", (req, res) => {
  const query = "SELECT storename, image FROM stores";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching stores:", err);
      res.status(500).send("Internal Server Error");
      return;
    }
    res.json(results);
  });
});

app.get("/store/:storename", (req, res) => {
  const { storename } = req.params;
  const query = "SELECT * FROM stores WHERE storename = ?";
  db.query(query, [storename], (err, results) => {
    if (err) {
      console.error("Error fetching store details:", err);
      res.status(500).send("Internal Server Error");
      return;
    }
    if (results.length === 0) {
      res.status(404).send("Store not found");
      return;
    }
    res.json(results[0]);
  });
});

app.get("/addtocart", (req, res) => {
  const email = useremail;
  const query = "SELECT * FROM addtocart WHERE useremail = ?";
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error("Error fetching items:", err);
      res.status(500).send("Internal Server Error");
      return;
    }
    res.json(results);
  });
});

app.get("/storesData", (req, res) => {
  const query = "SELECT name, image, price FROM stores WHERE storename=?";
  db.query(query, [req.query.storename], (err, results) => {
    if (err) {
      console.error("Error fetching items:", err);
      res.status(500).send("Internal Server Error");
      return;
    }
    res.json(results);
  });
});

app.get("/ownerstoreitems", (req, res) => {
  const { storename } = req.query;
  const query = "SELECT name, image, price FROM stores WHERE storename = ?";
  db.query(query, [storename], (err, results) => {
    if (err) {
      console.error("Error fetching items:", err);
      res.status(500).send("Internal Server Error");
      return;
    }
    res.json(results);
  });
});

app.post("/removeitem", (req, res) => {
  const { productname } = req.body;
  const email = useremail;
  const deleteQuery =
    "DELETE FROM addtocart WHERE productname = ? AND useremail = ?";
  db.query(deleteQuery, [productname, email], (err, result) => {
    if (err) {
      console.error(err);
      return res.json("Error");
    }
    return res.json("Success");
  });
});

app.get("/acanteendata", (req, res) => {
  const fetchQuery = "SELECT * FROM acanteendata";
  db.query(fetchQuery, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json(result);
  });
});

app.get("/amuldata", (req, res) => {
  const fetchQuery = "SELECT * FROM amuldata";
  db.query(fetchQuery, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json(result);
  });
});

app.get("/bakerydata", (req, res) => {
  const fetchQuery = "SELECT * FROM bakerydata";
  db.query(fetchQuery, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json(result);
  });
});

app.get("/centralsquaredata", (req, res) => {
  const fetchQuery = "SELECT * FROM centralsquaredata";
  db.query(fetchQuery, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json(result);
  });
});

app.get("/chittidlidata", (req, res) => {
  const fetchQuery = "SELECT * FROM chittidlidata";
  db.query(fetchQuery, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json(result);
  });
});

app.get("/dosacornerdata", (req, res) => {
  const fetchQuery = "SELECT * FROM dosacornerdata";
  db.query(fetchQuery, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json(result);
  });
});

app.get("/juicestalldata", (req, res) => {
  const fetchQuery = "SELECT * FROM juicestalldata";
  db.query(fetchQuery, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json(result);
  });
});

app.get("/kathiesdata", (req, res) => {
  const fetchQuery = "SELECT * FROM kathiesdata";
  db.query(fetchQuery, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json(result);
  });
});

app.get("/nightcafeteriadata", (req, res) => {
  const fetchQuery = "SELECT * FROM nightcafeteriadata";
  db.query(fetchQuery, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json(result);
  });
});

app.get("/softysdata", (req, res) => {
  const fetchQuery = "SELECT * FROM softysdata";
  db.query(fetchQuery, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json(result);
  });
});

app.get("/templesquaredata", (req, res) => {
  const fetchQuery = "SELECT * FROM templesquaredata";
  db.query(fetchQuery, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json(result);
  });
});

app.get("/yummidata", (req, res) => {
  const fetchQuery = "SELECT * FROM yummidata";
  db.query(fetchQuery, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json(result);
  });
});

app.get("/", (req, res) => {
  res.send("Welcome SERVER SIDE!");
});

app.get("/signup", (req, res) => {
  res.send("Welcome to the signup server!");
});

app.get("/ownersignup", (req, res) => {
  res.send("Welcome to ownersignup");
});

app.get("/ownerlogin", (req, res) => {
  console.log("Welcome");
  res.send("Welcome");
});

app.get("/login", (req, res) => {
  console.log("Welcome to the login server!");
  res.send("Welcome to the login server!");
});

app.listen(9090, () => {
  console.log("Server is running on port 9090");
});
