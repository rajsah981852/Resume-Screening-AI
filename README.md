# Resume-Screening-AI
ResumeAI is a full-stack web application designed to help recruiters analyze, filter, and rank resumes automatically.

It leverages AI + NLP (Sentence Transformers) to extract skills, evaluate candidates, and provide structured insights — reducing manual screening effort.

✨ Key Features
👤 User Panel
🔐 Secure Authentication (JWT-based Login/Register)
📄 Upload resumes (PDF/DOCX)
🤖 AI-powered resume analysis
📊 Skill extraction & scoring
🕓 View analysis history
🛠️ Admin Panel
👑 First registered user becomes Admin
👥 Manage users
📂 Manage resumes
📈 Platform statistics dashboard
🤖 AI Engine
Resume parsing (PDF/DOCX)
Skill matching (~130 predefined skills)
Semantic similarity using sentence-transformers
Intelligent scoring system
🏗️ Tech Stack
Backend: FastAPI (Python)
Frontend: HTML, CSS, Vanilla JavaScript
Database: MongoDB
AI/NLP: Sentence Transformers
Authentication: JWT + Bcrypt
📁 Project Structure
resume-ai/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── auth.py
│   ├── admin.py
│   ├── parser.py
│   ├── model.py
│   ├── skills.json
│   └── requirements.txt
│
└── frontend/
    ├── register.html
    ├── login.html
    ├── index.html
    ├── admin.html
    ├── style.css
    ├── auth.js
    ├── script.js
    └── admin.js
⚙️ Installation & Setup
🔹 Prerequisites
Python 3.9+
MongoDB (Local / Atlas)
Browser
🔧 Backend Setup
cd backend

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

# Run server
python main.py
# OR
uvicorn main:app --reload --port 8000

👉 API: http://localhost:8000

👉 Docs: http://localhost:8000/docs

🗄️ MongoDB Setup

Local:

mongod --dbpath /data/db

Atlas:

export MONGO_URI="mongodb+srv://<user>:<pass>@cluster.mongodb.net/?retryWrites=true"
🔐 Environment Variables
export SECRET_KEY="your-secret-key"
export MONGO_URI="mongodb://localhost:27017"
export DB_NAME="resume_ai"
export TOKEN_EXPIRE_HOURS="24"
🌐 Frontend Setup
cd frontend

python -m http.server 3000
# OR
npx serve .

👉 Open: http://localhost:3000/register.html

👑 Admin Access
First registered user → Admin
Admin Panel → /admin.html
📡 API Endpoints
Method	Endpoint	Description
POST	/register	Register user
POST	/login	Login user
POST	/analyze	Analyze resume
GET	/history	User history
GET	/admin/users	All users
GET	/admin/resumes	All resumes
DELETE	/admin/user/{id}	Delete user
DELETE	/admin/resume/{id}	Delete resume
GET	/admin/stats	System stats
🔒 Security
Password hashing (bcrypt)
JWT authentication
Role-based access control
🚀 Future Enhancements
Job description matching 🎯
Resume ranking leaderboard 🏆
AI interview question generator 🤖
Email notifications 📧
Multi-company hiring dashboard 🏢
🤝 Contributing

Pull requests are welcome!
For major changes, please open an issue first.

📜 License

MIT License

👨‍💻 Author

Raj Sah
Aspiring AI Engineer & Full Stack Developer
