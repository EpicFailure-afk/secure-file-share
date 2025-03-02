# **Secure File Share - Frontend**  

This is the frontend of the **Secure File Share** project, built using **React.js** with **Vite**. The application includes authentication pages with smooth animations and a modern UI design.  

## **📌 Features Implemented**  

### **1️⃣ Project Setup**  
- Initialized a React project using **Vite**.  
- Installed necessary dependencies:
  ```bash
  npm install react-router-dom framer-motion
  ```
- Set up project structure with a `pages` folder for **Login** and **Register** components.  

### **2️⃣ Authentication Pages (Login & Register)**  
- Designed **Login** and **Register** pages with a modern UI.  
- Implemented **form validation**:
  - Login requires **email and password**.  
  - Register includes **username, email, password, and confirm password**.  
  - Password confirmation logic ensures the two passwords match.  
- Styled the pages with a blurred background and smooth form design.  

### **3️⃣ Routing with React Router**  
- Configured **react-router-dom** for navigation.  
- Added routes in `App.jsx`:
  ```jsx
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
  </Routes>
  ```
- Linked the "Sign Up" button on the login page to navigate to the register page and vice versa.  

### **4️⃣ Page Transition Animations**  
- Integrated **Framer Motion** for smooth animations when switching between login and register pages.  
- Pages slide in/out when navigating.  
- Used **AnimatePresence** in `App.jsx` to ensure animations run correctly:
  ```jsx
  <AnimatePresence mode="wait">
    <Routes location={location} key={location.pathname}>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  </AnimatePresence>
  ```

## **📂 Project Structure**  
```
frontend/
│── src/
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   ├── App.jsx
│   ├── main.jsx
│── public/
│── package.json
│── README.md
```

