from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import random
import os
from dotenv import load_dotenv
import io
import xlsxwriter

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///instance/robots.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Bu sayfaya erişmek için giriş yapmalısınız.'
login_manager.login_message_category = 'warning'

# Database Models
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    robots = db.relationship('Robot', backref='owner', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Robot(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(20), default='active')
    battery = db.Column(db.Integer, default=100)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    sensors = db.relationship('SensorData', backref='robot', lazy=True, cascade='all, delete-orphan')

class SensorData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    robot_id = db.Column(db.Integer, db.ForeignKey('robot.id'), nullable=False)
    temperature = db.Column(db.Float)
    humidity = db.Column(db.Float)
    speed = db.Column(db.Float)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Authentication Routes
@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        if User.query.filter_by(username=username).first():
            flash('Bu kullanıcı adı zaten kullanılıyor.', 'danger')
            return redirect(url_for('register'))
        
        if User.query.filter_by(email=email).first():
            flash('Bu email adresi zaten kayıtlı.', 'danger')
            return redirect(url_for('register'))
        
        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        flash('Kayıt başarılı! Şimdi giriş yapabilirsiniz.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        remember = request.form.get('remember', False)
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            login_user(user, remember=remember)
            next_page = request.args.get('next')
            flash(f'Hoş geldiniz, {user.username}!', 'success')
            return redirect(next_page if next_page else url_for('dashboard'))
        else:
            flash('Kullanıcı adı veya şifre hatalı.', 'danger')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Başarıyla çıkış yaptınız.', 'info')
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    robots = Robot.query.filter_by(user_id=current_user.id).all()
    return render_template('dashboard.html', robots=robots)

@app.route('/reports')
@login_required
def reports():
    return render_template('reports.html')

# REST API Endpoints
@app.route('/api/robots', methods=['GET'])
@login_required
def get_robots():
    robots = Robot.query.filter_by(user_id=current_user.id).all()
    return jsonify([{
        'id': r.id,
        'name': r.name,
        'model': r.model,
        'status': r.status,
        'battery': r.battery,
        'created_at': r.created_at.strftime('%Y-%m-%d %H:%M'),
        'sensor_count': len(r.sensors)
    } for r in robots])

@app.route('/api/robots', methods=['POST'])
@login_required
def add_robot():
    data = request.json
    robot = Robot(
        name=data['name'],
        model=data['model'],
        status='active',
        battery=100,
        user_id=current_user.id
    )
    db.session.add(robot)
    db.session.commit()
    return jsonify({'message': 'Robot added', 'id': robot.id}), 201

@app.route('/api/robots/<int:id>', methods=['DELETE'])
@login_required
def delete_robot(id):
    robot = Robot.query.filter_by(id=id, user_id=current_user.id).first_or_404()
    db.session.delete(robot)
    db.session.commit()
    return jsonify({'message': 'Robot deleted'})

@app.route('/api/robots/<int:id>', methods=['PUT'])
@login_required
def update_robot(id):
    robot = Robot.query.filter_by(id=id, user_id=current_user.id).first_or_404()
    data = request.json
    robot.name = data.get('name', robot.name)
    robot.model = data.get('model', robot.model)
    robot.status = data.get('status', robot.status)
    robot.battery = data.get('battery', robot.battery)
    db.session.commit()
    return jsonify({'message': 'Robot updated'})

@app.route('/api/sensors/<int:robot_id>')
@login_required
def get_sensor_data(robot_id):
    robot = Robot.query.filter_by(id=robot_id, user_id=current_user.id).first_or_404()
    sensors = SensorData.query.filter_by(robot_id=robot_id).order_by(SensorData.timestamp.desc()).limit(50).all()
    return jsonify([{
        'temperature': s.temperature,
        'humidity': s.humidity,
        'speed': s.speed,
        'timestamp': s.timestamp.strftime('%H:%M:%S')
    } for s in sensors])

@app.route('/api/stats')
@login_required
def get_stats():
    robots = Robot.query.filter_by(user_id=current_user.id).all()
    total_sensors = sum(len(r.sensors) for r in robots)
    return jsonify({
        'total_robots': len(robots),
        'active_robots': len([r for r in robots if r.status == 'active']),
        'total_sensors': total_sensors
    })

@app.route('/api/simulate/<int:robot_id>', methods=['POST'])
@login_required
def simulate_data(robot_id):
    robot = Robot.query.filter_by(id=robot_id, user_id=current_user.id).first_or_404()
    sensor = SensorData(
        robot_id=robot_id,
        temperature=round(random.uniform(20, 30), 1),
        humidity=round(random.uniform(40, 60), 1),
        speed=round(random.uniform(0, 5), 2)
    )
    robot.battery = max(0, robot.battery - random.randint(1, 5))
    db.session.add(sensor)
    db.session.commit()
    return jsonify({'message': 'Sensor data simulated'})

# YENİ: Toplu sensor verisi yükleme (robot_id ile)
@app.route('/api/robots/bulk-upload', methods=['POST'])
@login_required
def bulk_upload_sensors():
    """Toplu sensor verisi yükleme - robot_id ile"""
    try:
        data = request.json
        
        if not data or 'robots' not in data:
            return jsonify({'error': 'JSON formatı hatalı. "robots" dizisi gerekli.'}), 400
        
        results = []
        total_sensors = 0
        
        for robot_data in data['robots']:
            robot_id = robot_data.get('robot_id')
            sensors_data = robot_data.get('sensors', [])
            
            if not robot_id:
                results.append({
                    'status': 'error',
                    'message': 'robot_id gerekli'
                })
                continue
            
            # Robot kontrolü (kullanıcıya ait olmalı)
            robot = Robot.query.filter_by(id=robot_id, user_id=current_user.id).first()
            
            if not robot:
                results.append({
                    'robot_id': robot_id,
                    'status': 'error',
                    'message': 'Robot bulunamadı veya size ait değil'
                })
                continue
            
            # Sensor verilerini ekle
            count = 0
            for sensor_data in sensors_data:
                try:
                    sensor = SensorData(
                        robot_id=robot_id,
                        temperature=float(sensor_data.get('temperature', 0)),
                        humidity=float(sensor_data.get('humidity', 0)),
                        speed=float(sensor_data.get('speed', 0))
                    )
                    db.session.add(sensor)
                    count += 1
                except (ValueError, TypeError) as e:
                    continue
            
            total_sensors += count
            results.append({
                'robot_id': robot_id,
                'robot_name': robot.name,
                'status': 'success',
                'count': count
            })
        
        db.session.commit()
        
        return jsonify({
            'message': 'Toplu yükleme başarılı',
            'total_sensors': total_sensors,
            'results': results
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Tekli robot için sensor verisi yükleme
@app.route('/api/robots/<int:robot_id>/upload-sensors', methods=['POST'])
@login_required
def upload_sensors(robot_id):
    """Tekli robot için sensor verisi yükleme"""
    try:
        robot = Robot.query.filter_by(id=robot_id, user_id=current_user.id).first_or_404()
        data = request.json
        
        if not data or 'sensors' not in data:
            return jsonify({'error': 'JSON formatı hatalı. "sensors" dizisi gerekli.'}), 400
        
        count = 0
        for sensor_data in data['sensors']:
            try:
                sensor = SensorData(
                    robot_id=robot_id,
                    temperature=float(sensor_data.get('temperature', 0)),
                    humidity=float(sensor_data.get('humidity', 0)),
                    speed=float(sensor_data.get('speed', 0))
                )
                db.session.add(sensor)
                count += 1
            except (ValueError, TypeError):
                continue
        
        db.session.commit()
        
        return jsonify({
            'message': f'{count} sensor verisi başarıyla yüklendi',
            'count': count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/robots/smart-upload', methods=['POST'])
@login_required
def smart_upload():
    """Akıllı toplu yükleme - robot varsa güncelle, yoksa oluştur"""
    data = request.json
    
    if 'robots' not in data:
        return jsonify({'error': 'JSON formatı hatalı. "robots" anahtarı gerekli.'}), 400
    
    try:
        results = []
        total_sensors = 0
        new_robots = 0
        
        for robot_data in data['robots']:
            robot_name = robot_data.get('name')
            robot_model = robot_data.get('model')
            sensors_data = robot_data.get('sensors', [])
            
            if not robot_name or not robot_model:
                results.append({
                    'name': robot_name or 'Unknown',
                    'status': 'error',
                    'message': 'Robot adı ve model gerekli'
                })
                continue
            
            # Robot varsa bul, yoksa oluştur
            robot = Robot.query.filter_by(name=robot_name, user_id=current_user.id).first()
            
            if not robot:
                robot = Robot(
                    name=robot_name,
                    model=robot_model,
                    status='active',
                    battery=100,
                    user_id=current_user.id
                )
                db.session.add(robot)
                db.session.flush()
                new_robots += 1
                created = True
            else:
                created = False
            
            # Sensor verilerini ekle
            count = 0
            for sensor_data in sensors_data:
                sensor = SensorData(
                    robot_id=robot.id,
                    temperature=float(sensor_data.get('temperature', 0)),
                    humidity=float(sensor_data.get('humidity', 0)),
                    speed=float(sensor_data.get('speed', 0))
                )
                db.session.add(sensor)
                count += 1
            
            total_sensors += count
            results.append({
                'robot_id': robot.id,
                'name': robot.name,
                'model': robot.model,
                'status': 'success',
                'created': created,
                'sensor_count': count
            })
        
        db.session.commit()
        return jsonify({
            'message': f'İşlem başarılı! {new_robots} yeni robot oluşturuldu, {total_sensors} sensor verisi yüklendi',
            'total_sensors': total_sensors,
            'new_robots': new_robots,
            'results': results
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports/summary')
@login_required
def get_report_summary():
    """Rapor özeti"""
    robots = Robot.query.filter_by(user_id=current_user.id).all()
    
    report_data = []
    for robot in robots:
        sensors = robot.sensors
        
        if sensors:
            avg_temp = sum(s.temperature for s in sensors) / len(sensors)
            avg_humidity = sum(s.humidity for s in sensors) / len(sensors)
            avg_speed = sum(s.speed for s in sensors) / len(sensors)
            last_reading = max(s.timestamp for s in sensors)
        else:
            avg_temp = avg_humidity = avg_speed = 0
            last_reading = None
        
        report_data.append({
            'id': robot.id,
            'name': robot.name,
            'model': robot.model,
            'status': robot.status,
            'battery': robot.battery,
            'sensor_count': len(sensors),
            'avg_temperature': round(avg_temp, 2),
            'avg_humidity': round(avg_humidity, 2),
            'avg_speed': round(avg_speed, 2),
            'last_reading': last_reading.strftime('%Y-%m-%d %H:%M:%S') if last_reading else 'N/A',
            'created_at': robot.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    return jsonify(report_data)

@app.route('/api/reports/export')
@login_required
def export_report():
    """Excel raporu oluştur"""
    robots = Robot.query.filter_by(user_id=current_user.id).all()
    
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet('Robot Raporu')
    
    header_format = workbook.add_format({
        'bold': True,
        'bg_color': '#667eea',
        'font_color': 'white',
        'border': 1
    })
    
    cell_format = workbook.add_format({
        'border': 1
    })
    
    headers = ['ID', 'Robot Adı', 'Model', 'Durum', 'Batarya (%)', 
               'Sensor Sayısı', 'Ort. Sıcaklık (°C)', 'Ort. Nem (%)', 
               'Ort. Hız (m/s)', 'Son Okuma', 'Oluşturulma']
    
    for col, header in enumerate(headers):
        worksheet.write(0, col, header, header_format)
    
    row = 1
    for robot in robots:
        sensors = robot.sensors
        
        if sensors:
            avg_temp = sum(s.temperature for s in sensors) / len(sensors)
            avg_humidity = sum(s.humidity for s in sensors) / len(sensors)
            avg_speed = sum(s.speed for s in sensors) / len(sensors)
            last_reading = max(s.timestamp for s in sensors).strftime('%Y-%m-%d %H:%M:%S')
        else:
            avg_temp = avg_humidity = avg_speed = 0
            last_reading = 'N/A'
        
        worksheet.write(row, 0, robot.id, cell_format)
        worksheet.write(row, 1, robot.name, cell_format)
        worksheet.write(row, 2, robot.model, cell_format)
        worksheet.write(row, 3, robot.status, cell_format)
        worksheet.write(row, 4, robot.battery, cell_format)
        worksheet.write(row, 5, len(sensors), cell_format)
        worksheet.write(row, 6, round(avg_temp, 2), cell_format)
        worksheet.write(row, 7, round(avg_humidity, 2), cell_format)
        worksheet.write(row, 8, round(avg_speed, 2), cell_format)
        worksheet.write(row, 9, last_reading, cell_format)
        worksheet.write(row, 10, robot.created_at.strftime('%Y-%m-%d %H:%M:%S'), cell_format)
        
        row += 1
    
    worksheet.set_column(0, 0, 8)
    worksheet.set_column(1, 2, 20)
    worksheet.set_column(3, 3, 12)
    worksheet.set_column(4, 8, 15)
    worksheet.set_column(9, 10, 20)
    
    workbook.close()
    output.seek(0)
    
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=f'robot_raporu_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
    )

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)