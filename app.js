// 初始化地图
const mapContainer = document.getElementById('map');
const myChart = echarts.init(mapContainer);

// 省份代码映射
const provinceCode = {
    '北京': '110000',
    '天津': '120000',
    '河北': '130000',
    '山西': '140000',
    '内蒙古': '150000',
    '辽宁': '210000',
    '吉林': '220000',
    '黑龙江': '230000',
    '上海': '310000',
    '江苏': '320000',
    '浙江': '330000',
    '安徽': '340000',
    '福建': '350000',
    '江西': '360000',
    '山东': '370000',
    '河南': '410000',
    '湖北': '420000',
    '湖南': '430000',
    '广东': '440000',
    '广西': '450000',
    '海南': '460000',
    '重庆': '500000',
    '四川': '510000',
    '贵州': '520000',
    '云南': '530000',
    '西藏': '540000',
    '陕西': '610000',
    '甘肃': '620000',
    '青海': '630000',
    '宁夏': '640000',
    '新疆': '650000'
};

// 准备地图数据
const mapData = [];
for (let city in licensePlateData) {
    mapData.push({
        name: city,
        value: Math.random() * 100 + 50,
        plate: licensePlateData[city]
    });
}

// 延迟函数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 加载所有省份的市级地图数据
async function loadAllProvinceMaps() {
    const allFeatures = [];
    let successCount = 0;
    let failCount = 0;

    // 显示加载提示
    myChart.showLoading({
        text: '正在加载地图数据...\n请稍候',
        color: '#667eea',
        textColor: '#000',
        maskColor: 'rgba(255, 255, 255, 0.8)',
        zlevel: 0
    });

    console.log('开始加载省份地图数据...');

    try {
        // 分批加载省份数据，避免并发过多
        const batchSize = 5;
        const entries = Object.entries(provinceCode);

        for (let i = 0; i < entries.length; i += batchSize) {
            const batch = entries.slice(i, i + batchSize);

            const batchPromises = batch.map(async ([province, code]) => {
                try {
                    const url = `https://geo.datav.aliyun.com/areas_v3/bound/${code}_full.json`;
                    console.log(`正在加载: ${province} (${code})`);

                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();

                    if (data && data.features && Array.isArray(data.features)) {
                        successCount++;
                        console.log(`✓ ${province} 加载成功，包含 ${data.features.length} 个区域`);
                        return data.features;
                    } else {
                        console.warn(`${province} 数据格式错误`);
                        return [];
                    }
                } catch (error) {
                    failCount++;
                    console.warn(`✗ 加载 ${province} 失败:`, error.message);
                    return [];
                }
            });

            const batchResults = await Promise.all(batchPromises);

            // 合并本批次的特征
            batchResults.forEach(features => {
                if (features && Array.isArray(features) && features.length > 0) {
                    allFeatures.push(...features);
                }
            });

            // 更新加载提示
            myChart.showLoading({
                text: `正在加载地图数据...\n已加载: ${successCount}/${entries.length} 个省份`,
                color: '#667eea',
                textColor: '#000',
                maskColor: 'rgba(255, 255, 255, 0.8)',
                zlevel: 0
            });

            // 批次间延迟，避免请求过快
            if (i + batchSize < entries.length) {
                await delay(200);
            }
        }

        console.log(`\n加载完成统计:`);
        console.log(`成功: ${successCount} 个省份`);
        console.log(`失败: ${failCount} 个省份`);
        console.log(`总特征数: ${allFeatures.length} 个区域`);

        if (allFeatures.length === 0) {
            throw new Error('未能加载任何地图数据，请检查网络连接或刷新页面重试');
        }

        // 创建完整的 GeoJSON
        const chinaGeoJson = {
            type: 'FeatureCollection',
            features: allFeatures
        };

        // 注册地图
        echarts.registerMap('china', chinaGeoJson);
        console.log('地图注册成功！');

        // 隐藏加载提示
        myChart.hideLoading();

        // 配置地图选项
        const option = {
            backgroundColor: '#f5f5f5',
            tooltip: {
                trigger: 'item',
                formatter: function(params) {
                    const name = params.name;
                    let plate = licensePlateData[name];

                    // 尝试去掉后缀匹配
                    if (!plate) {
                        const simpleName = name.replace(/(市|省|自治区|特别行政区|自治州|地区|盟)$/g, '');
                        plate = licensePlateData[simpleName];
                    }

                    if (plate) {
                        return `<div style="padding: 5px;">
                            <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">${name}</div>
                            <div style="color: #4fc3f7; font-size: 18px; font-weight: bold;">车牌: ${plate}</div>
                        </div>`;
                    }
                    return `<div style="padding: 5px;">
                        <div style="font-weight: bold; font-size: 16px;">${name}</div>
                    </div>`;
                },
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                borderColor: '#333',
                borderWidth: 0,
                textStyle: {
                    color: '#fff',
                    fontSize: 14
                },
                padding: 15
            },
            visualMap: {
                show: false,
                min: 0,
                max: 200,
                inRange: {
                    color: ['#e0f3ff', '#b3d9ff', '#66b3ff', '#3399ff', '#0080ff']
                }
            },
            series: [
                {
                    name: '车牌号',
                    type: 'map',
                    map: 'china',
                    roam: true,
                    scaleLimit: {
                        min: 0.8,
                        max: 20
                    },
                    zoom: 1.2,
                    label: {
                        show: true,
                        color: '#333',
                        fontSize: 8,
                        fontWeight: 'normal'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 'bold'
                        },
                        itemStyle: {
                            areaColor: '#ffa726',
                            borderColor: '#ff6f00',
                            borderWidth: 2,
                            shadowBlur: 15,
                            shadowColor: 'rgba(255, 167, 38, 0.5)'
                        }
                    },
                    itemStyle: {
                        borderColor: '#0066cc',
                        borderWidth: 0.8,
                        shadowBlur: 5,
                        shadowColor: 'rgba(0, 0, 0, 0.1)'
                    },
                    data: mapData
                }
            ]
        };

        // 设置配置并渲染
        myChart.setOption(option);
        console.log('地图渲染成功！');

        // 点击事件处理
        myChart.on('click', function(params) {
            if (params.componentType === 'series') {
                let cityName = params.name;
                let plateNumber = licensePlateData[cityName];

                // 如果直接找不到，尝试去掉后缀
                if (!plateNumber) {
                    const simpleName = cityName.replace(/(市|省|自治区|特别行政区|自治州|地区|盟)$/g, '');
                    plateNumber = licensePlateData[simpleName];
                    if (plateNumber) {
                        cityName = simpleName;
                    }
                }

                if (plateNumber) {
                    showModal(cityName, plateNumber);
                } else {
                    console.log(`未找到 ${params.name} 的车牌信息`);
                }
            }
        });

        // 响应式处理
        window.addEventListener('resize', function() {
            myChart.resize();
        });

    } catch (error) {
        myChart.hideLoading();
        console.error('加载地图数据失败:', error);

        // 显示错误信息
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            text-align: center;
            max-width: 500px;
        `;
        errorDiv.innerHTML = `
            <h3 style="color: #f44336; margin-bottom: 15px;">地图加载失败</h3>
            <p style="margin-bottom: 15px;">${error.message}</p>
            <p style="color: #666; font-size: 14px;">成功加载: ${successCount} 个省份<br>失败: ${failCount} 个省份</p>
            <button onclick="location.reload()" style="
                margin-top: 15px;
                padding: 10px 30px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            ">重新加载</button>
        `;
        document.body.appendChild(errorDiv);
    }
}

// 加载地图
loadAllProvinceMaps();

// 显示模态弹窗
function showModal(cityName, plateNumber) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>${cityName}</h2>
            <div class="plate-display">${plateNumber}</div>
            <p class="modal-info">点击任意位置或按 ESC 键关闭</p>
        </div>
    `;

    document.body.appendChild(modal);

    if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
            .modal {
                display: block;
                position: fixed;
                z-index: 10000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                animation: fadeIn 0.3s;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideIn {
                from {
                    transform: translateY(-50px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            .modal-content {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 10% auto;
                padding: 40px;
                border-radius: 15px;
                width: 80%;
                max-width: 500px;
                text-align: center;
                position: relative;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                animation: slideIn 0.3s;
            }

            .modal-content h2 {
                color: white;
                font-size: 32px;
                margin-bottom: 30px;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            }

            .plate-display {
                background: white;
                color: #333;
                padding: 20px 30px;
                border-radius: 10px;
                font-size: 36px;
                font-weight: bold;
                margin: 20px 0;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                letter-spacing: 3px;
                border: 3px solid #0066cc;
            }

            .modal-info {
                color: rgba(255, 255, 255, 0.9);
                font-size: 14px;
                margin-top: 20px;
            }

            .close {
                color: white;
                position: absolute;
                right: 20px;
                top: 15px;
                font-size: 35px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
            }

            .close:hover,
            .close:focus {
                color: #ffeb3b;
                transform: rotate(90deg);
            }
        `;
        document.head.appendChild(style);
    }

    function closeModal() {
        modal.style.animation = 'fadeIn 0.3s reverse';
        setTimeout(() => {
            modal.remove();
        }, 300);
    }

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = closeModal;

    modal.onclick = function(event) {
        if (event.target === modal) {
            closeModal();
        }
    };

    const escHandler = function(event) {
        if (event.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}
