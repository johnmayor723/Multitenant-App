const express = require("express");
const router = express.Router();

// Middleware to check for current user
const isLogin = (req, res, next) => {
  if (!req.session.currentUser) {
    req.flash("error_msg", "Access denied. Please log in."); // Flash a message for the user
    return res.redirect("/login"); // Redirect to the login page
  }
  next();
};
// Helper functions
const findProductInCart = (cartItems, productId) => {
    return cartItems.find(item => item.id === productId);
};

const calculateTotals = (cart) => {
    cart.totalQty = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
};


//route to add a product to cart.
router.post('/:id', (req, res) => {
    try {
    const { name, price, imageUrl, qty, size, color } = req.body;
    const id = req.params.id
    
    let product = findProductInCart(req.session.cart.items, id);

    if (product) {
        product.quantity += qty;
    } else {
        req.session.cart.items.push({ id, name, imageUrl,size, color, price, quantity: qty });
    }
    calculateTotals(req.session.cart);
    console.log("Cart Items:", req.session.cart.items);
    req.flash('success_msg', 'Item added to cart!');
    res.redirect('/cart');
    } catch (error) {
    console.error("Error fetching product:", error);
    req.flash('error_msg', 'Item not added to cart!');
    res.redirect('/');
    
  }
});



// route to get cart
router.get('/', isLogin, (req, res) => {
     console.log("cart in session:", req.session.cart )
    res.render('shopping-cart', { cart: req.session.cart, title: "Cart" });
});


// Reduce product quantity by one
router.post('/reduce/:id', (req, res) => {
    const { id } = req.params;
    let product = findProductInCart(req.session.cart.items, id);

    if (product && product.quantity > 1) {
        product.quantity -= 1;
    } else if (product) {
        req.session.cart.items = req.session.cart.items.filter(item => item.id !== id);
    }
    calculateTotals(req.session.cart);
    res.redirect('/cart');
});




// increase product quantity by one
router.post('/increase/:id', (req, res) => {
    const { id } = req.params;
    console.log("Received ID:", id); // Log to verify that the ID is correct

    let product = findProductInCart(req.session.cart.items, id);
    console.log("Found product:", product);

    if (product) {
        product.quantity += 1;
        calculateTotals(req.session.cart); // Assuming this updates total amount and quantity
    }
    
    res.redirect('/cart');
});


// Remove product from cart
router.post('/remove/:id', (req, res) => {
    const { id } = req.params;
    req.session.cart.items = req.session.cart.items.filter(item => item.id !== id);
    calculateTotals(req.session.cart);
    res.redirect('/cart');
});



// Route to clear the cart session
router.get("/clearCart", (req, res) => {
  req.session.cart = null;
  req.flash('success_msg', 'Cart has been cleared successfully.'); 
  res.redirect('/cart');
});



module.exports = router;
 
