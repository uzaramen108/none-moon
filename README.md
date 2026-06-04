# McCabe-Thiele Method Online

_&check;_ _English_ | [_Korean(한국어)_](README.ko.md)

**McCabe-Thiele Method Online** is created by undergraduate chemical engineering students, is a web-based simulation tool designed to help chemical engineering students and professionals visualize binary distillation processes. It automates the graphical construction of McCabe-Thiele diagrams to determine the theoretical number of plates, minimum reflux ratio, and optimal feed location. Future updates will provide tools for other chemical processes.

You can try the calculator here: https://uzaramen108.github.io/McCabe-Thiele-method-online/

<img width="1423" height="1261" alt="image" src="https://github.com/user-attachments/assets/01f62700-90f2-4675-bb45-4baf559622f7" />

## Used Tech

This project utilizes a modern web stack to deliver an interactive engineering tool without the need for complex server-side infrastructure.

- **[Chart.js](https://www.chartjs.org/):**

  - Used as the core visualization engine to render the McCabe-Thiele diagram on the HTML5 Canvas.
  - Handles the precise plotting of the Equilibrium Curve, Operating Lines (Rectifying/Stripping), q-line, and the step-by-step stage construction.

- **[Supabase](https://supabase.com/) (PostgreSQL):**

  - Serves as the backend database to store Vapor-Liquid Equilibrium (VLE) system data.
  - Allows the application to maintain a shared, persistent library of chemical systems that all users can access and contribute to.

- **LocalStorage (Web API):**

  - Implements a lightweight ownership management system.
  - Instead of a full authentication system, the application stores the unique IDs of user-created data in the browser's LocalStorage. This grants the creator "delete permissions" for their own data while keeping the platform open and accessible.

- **Webpack:**
  - Bundles JavaScript modules and assets for optimized production deployment.
