"""
Mevcut verileri koruyarak veritabanını günceller.
Eski robotları yeni bir demo kullanıcıya atar.
"""

import sqlite3
import os
from app import app, db, User, Robot, SensorData
from werkzeug.security import generate_password_hash

def migrate_database():
    db_path = 'instance/robots.db'
    
    # Veritabanı var mı kontrol et
    if not os.path.exists(db_path):
        print("Veritabanı bulunamadı. Yeni veritabanı oluşturuluyor...")
        with app.app_context():
            db.create_all()
        print("✓ Yeni veritabanı oluşturuldu!")
        return
    
    print("Migration başlatılıyor...")
    
    # SQLite bağlantısı
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # user_id kolonu var mı kontrol et
        cursor.execute("PRAGMA table_info(robot)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'user_id' in columns:
            print("✓ Veritabanı zaten güncel!")
            conn.close()
            return
        
        print("Eski veriler yedekleniyor...")
        
        # Eski robot verilerini al
        cursor.execute("SELECT id, name, model, status, battery, created_at FROM robot")
        old_robots = cursor.fetchall()
        
        # Eski sensor verilerini al
        cursor.execute("SELECT id, robot_id, temperature, humidity, speed, timestamp FROM sensor_data")
        old_sensors = cursor.fetchall()
        
        conn.close()
        
        print(f"✓ {len(old_robots)} robot ve {len(old_sensors)} sensör verisi yedeklendi")
        
        # Eski veritabanını sil
        os.remove(db_path)
        print("✓ Eski veritabanı silindi")
        
        # Yeni veritabanını oluştur
        with app.app_context():
            db.create_all()
            print("✓ Yeni veritabanı şeması oluşturuldu")
            
            # Demo kullanıcı oluştur
            demo_user = User(
                username='demo',
                email='demo@robotfleet.com'
            )
            demo_user.set_password('demo123')
            db.session.add(demo_user)
            db.session.commit()
            print(f"✓ Demo kullanıcı oluşturuldu (kullanıcı: demo, şifre: demo123)")
            
            # Eski robotları yeni kullanıcıya ata
            for old_robot in old_robots:
                robot = Robot(
                    id=old_robot[0],
                    name=old_robot[1],
                    model=old_robot[2],
                    status=old_robot[3],
                    battery=old_robot[4],
                    user_id=demo_user.id
                )
                db.session.add(robot)
            
            db.session.commit()
            print(f"✓ {len(old_robots)} robot yeni kullanıcıya atandı")
            
            # Eski sensör verilerini geri yükle
            for old_sensor in old_sensors:
                sensor = SensorData(
                    id=old_sensor[0],
                    robot_id=old_sensor[1],
                    temperature=old_sensor[2],
                    humidity=old_sensor[3],
                    speed=old_sensor[4]
                )
                db.session.add(sensor)
            
            db.session.commit()
            print(f"✓ {len(old_sensors)} sensör verisi geri yüklendi")
        
        print("\n🎉 Migration tamamlandı!")
        print("\nDemo hesap bilgileri:")
        print("  Kullanıcı adı: demo")
        print("  Şifre: demo123")
        print("\nTüm eski robotlar bu hesaba atandı.")
        
    except Exception as e:
        print(f"❌ Hata oluştu: {e}")
        conn.close()

if __name__ == '__main__':
    migrate_database()