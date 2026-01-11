# 🤖 Robot Monitoring Dashboard

A full-stack web application for real-time monitoring and management of industrial robot fleets.

## 🚀 Live Demo

**[https://robot-dashboard-osp2.onrender.com](https://robot-dashboard-osp2.onrender.com)**

## ✨ Features

- 📊 **Real-time Dashboard** - Monitor robot status, battery levels, and fleet statistics
- 📈 **Sensor Visualization** - Interactive charts for temperature, humidity, and speed data
- 📥 **Excel Export** - Download complete robot data and statistics in .xlsx format
- 📤 **JSON Bulk Upload** - Import multiple sensor readings at once with validation
- 📋 **Detailed Reports** - Comprehensive robot and sensor statistics with filtering

## 🛠️ Tech Stack

**Backend:** Python, Flask, PostgreSQL, Pandas  
**Frontend:** HTML5, CSS3, Bootstrap 5, JavaScript, Chart.js  
**Deployment:** Render.com

## 📦 Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/robot-dashboard.git
cd robot-dashboard

# Install dependencies
pip install -r requirements.txt

# Set environment variables
# Create .env file with DATABASE_URL

# Initialize database
python init_db.py

# Run application
flask run
```

## 🔌 API Endpoints

```
GET    /api/robots              # List all robots
POST   /api/robots              # Create new robot
PUT    /api/robots/<id>         # Update robot
DELETE /api/robots/<id>         # Delete robot
GET    /api/sensors/<robot_id>  # Get sensor data
POST   /api/upload              # Bulk upload (JSON)
GET    /api/export/excel        # Export to Excel
```


## 🎯 Key Functionality

### Dashboard
- Total robots count
- Active/Maintenance/Standby statistics
- Average fleet battery level
- Individual robot cards with quick actions

### Sensor Data
- Real-time chart visualization
- Last 4 measurements display
- Temperature (°C), Humidity (%), Speed (m/s)

### Data Management
- Excel export with all robot statistics
- JSON bulk upload with example format
- Data validation and error handling



---

⭐ Star this repo if you find it useful!
