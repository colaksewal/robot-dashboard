// Ana Uygulama
const App = {
    // Uygulama başlangıcı
    async init() {
        console.log('🤖 Robot Fleet Monitoring başlatılıyor...');
        
        // Event listener'ları ayarla
        this.setupEventListeners();
        
        // Dosya yükleme modüllerini başlat
        FileUploader.initSingleUpload();
        FileUploader.initBulkUpload();
        
        // İlk yükleme
        await this.loadRobots();
        
        // Otomatik yenileme (10 saniye)
        setInterval(() => this.loadRobots(), 10000);
        
        console.log('✅ Uygulama başarıyla başlatıldı!');
    },

    // Event listener'ları ayarla
    setupEventListeners() {
        // Robot ekleme butonu
        const addRobotBtn = document.getElementById('addRobotBtn');
        if (addRobotBtn) {
            addRobotBtn.addEventListener('click', () => UI.addRobot());
        }

        // Enter tuşu ile robot ekleme
        const robotNameInput = document.getElementById('robotName');
        const robotModelInput = document.getElementById('robotModel');
        
        [robotNameInput, robotModelInput].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        UI.addRobot();
                    }
                });
            }
        });

        // Modal temizleme
        const addRobotModal = document.getElementById('addRobotModal');
        if (addRobotModal) {
            addRobotModal.addEventListener('hidden.bs.modal', () => {
                document.getElementById('robotName').value = '';
                document.getElementById('robotModel').value = '';
            });
        }

        const uploadSensorModal = document.getElementById('uploadSensorModal');
        if (uploadSensorModal) {
            uploadSensorModal.addEventListener('hidden.bs.modal', () => {
                document.getElementById('uploadResult').innerHTML = '';
                document.getElementById('fileInput').value = '';
            });
        }

        const bulkUploadModal = document.getElementById('bulkUploadModal');
        if (bulkUploadModal) {
            bulkUploadModal.addEventListener('hidden.bs.modal', () => {
                document.getElementById('bulkUploadResult').innerHTML = '';
                document.getElementById('bulkFileInput').value = '';
            });
        }
    },

    // Robotları yükle
    async loadRobots() {
        try {
            const robots = await API.getRobots();
            UI.updateStats(robots);
            UI.renderRobots(robots);
        } catch (error) {
            console.error('Robotlar yüklenirken hata:', error);
            UI.showToast('Robotlar yüklenirken hata oluştu!', 'error');
        }
    },

    // Tüm verileri yenile
    async refresh() {
        console.log('🔄 Veriler yenileniyor...');
        await this.loadRobots();
        UI.showToast('Veriler yenilendi!', 'success');
    }
};

// Sayfa yüklendiğinde uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Global fonksiyonlar (HTML'den çağrılabilir)
window.App = App;
window.UI = UI;
window.API = API;
window.FileUploader = FileUploader;