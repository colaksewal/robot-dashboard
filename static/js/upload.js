// Dosya Yükleme İşlemleri
const FileUploader = {
    // Tekli robot için dosya yükleme
    initSingleUpload() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        // Drag & Drop events
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) {
                await this.uploadSingleFile(file);
            }
        });

        // File input change
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.uploadSingleFile(file);
            }
            fileInput.value = ''; // Reset input
        });
    },

    // Toplu yükleme için dosya yükleme
    initBulkUpload() {
        const bulkDropZone = document.getElementById('bulkDropZone');
        const bulkFileInput = document.getElementById('bulkFileInput');

        // Drag & Drop events
        bulkDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            bulkDropZone.classList.add('dragover');
        });

        bulkDropZone.addEventListener('dragleave', () => {
            bulkDropZone.classList.remove('dragover');
        });

        bulkDropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            bulkDropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) {
                await this.uploadBulkFile(file);
            }
        });

        // File input change
        bulkFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.uploadBulkFile(file);
            }
            bulkFileInput.value = ''; // Reset input
        });
    },

    // Tekli dosya yükleme
    async uploadSingleFile(file) {
        if (!file.name.endsWith('.json')) {
            this.showUploadResult('Sadece JSON dosyası yükleyebilirsiniz!', 'error', 'uploadResult');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                
                // JSON formatı kontrolü
                if (!jsonData.sensors || !Array.isArray(jsonData.sensors)) {
                    throw new Error('JSON formatı hatalı. "sensors" dizisi gerekli.');
                }

                // Yükleme göstergesi
                this.showUploadResult('Yükleniyor...', 'info', 'uploadResult');

                const result = await API.uploadSensorData(UI.currentRobotId, jsonData);
                
                this.showUploadResult(
                    `Başarılı! ${result.count} sensor verisi yüklendi.`,
                    'success',
                    'uploadResult'
                );
                
                await App.loadRobots();
                
            } catch (error) {
                this.showUploadResult(
                    `Hata: ${error.message}`,
                    'error',
                    'uploadResult'
                );
            }
        };
        
        reader.onerror = () => {
            this.showUploadResult('Dosya okunamadı!', 'error', 'uploadResult');
        };

        reader.readAsText(file);
    },

    // Toplu dosya yükleme
    async uploadBulkFile(file) {
        if (!file.name.endsWith('.json')) {
            this.showUploadResult('Sadece JSON dosyası yükleyebilirsiniz!', 'error', 'bulkUploadResult');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                
                // JSON formatı kontrolü
                if (!jsonData.robots || !Array.isArray(jsonData.robots)) {
                    throw new Error('JSON formatı hatalı. "robots" dizisi gerekli.');
                }

                // Yükleme göstergesi
                this.showUploadResult('Toplu yükleme yapılıyor...', 'info', 'bulkUploadResult');

                const result = await API.bulkUploadSensors(jsonData);
                
                // Sonuç detayları
                let resultHTML = `
                    <div class="alert alert-success">
                        <h6 class="alert-heading">
                            <i class="bi bi-check-circle me-2"></i>Toplu Yükleme Başarılı!
                        </h6>
                        <p class="mb-2">Toplam ${result.total_sensors} sensor verisi yüklendi.</p>
                        <hr>
                        <div class="mt-2">
                `;

                result.results.forEach(r => {
                    if (r.status === 'success') {
                        resultHTML += `
                            <div class="mb-1">
                                <i class="bi bi-check text-success me-2"></i>
                                <strong>${r.robot_name}</strong>: ${r.count} veri yüklendi
                            </div>
                        `;
                    } else {
                        resultHTML += `
                            <div class="mb-1">
                                <i class="bi bi-x text-danger me-2"></i>
                                <strong>Robot ID ${r.robot_id}</strong>: ${r.message}
                            </div>
                        `;
                    }
                });

                resultHTML += `
                        </div>
                    </div>
                `;

                document.getElementById('bulkUploadResult').innerHTML = resultHTML;
                
                await App.loadRobots();
                
            } catch (error) {
                this.showUploadResult(
                    `Hata: ${error.message}`,
                    'error',
                    'bulkUploadResult'
                );
            }
        };
        
        reader.onerror = () => {
            this.showUploadResult('Dosya okunamadı!', 'error', 'bulkUploadResult');
        };

        reader.readAsText(file);
    },

    // Yükleme sonucu göster
    showUploadResult(message, type, containerId) {
        const container = document.getElementById(containerId);
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'error' ? 'alert-danger' : 'alert-info';
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'x-circle' : 'info-circle';

        container.innerHTML = `
            <div class="alert ${alertClass}">
                <i class="bi bi-${icon} me-2"></i>
                ${message}
            </div>
        `;
    },

    // JSON örneği indir
    downloadSampleJSON(type = 'single') {
        let data;
        let filename;

        if (type === 'single') {
            data = {
                sensors: [
                    {
                        temperature: 24.5,
                        humidity: 45.2,
                        speed: 2.3
                    },
                    {
                        temperature: 25.1,
                        humidity: 44.8,
                        speed: 2.5
                    },
                    {
                        temperature: 23.8,
                        humidity: 46.1,
                        speed: 2.1
                    }
                ]
            };
            filename = 'sensor_data_sample.json';
        } else {
            data = {
                robots: [
                    {
                        robot_id: 1,
                        sensors: [
                            { temperature: 24.5, humidity: 45.2, speed: 2.3 },
                            { temperature: 25.1, humidity: 44.8, speed: 2.5 }
                        ]
                    },
                    {
                        robot_id: 2,
                        sensors: [
                            { temperature: 23.8, humidity: 47.1, speed: 1.9 },
                            { temperature: 24.2, humidity: 46.5, speed: 2.0 }
                        ]
                    }
                ]
            };
            filename = 'bulk_sensor_data_sample.json';
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};