// 설정값
const MODEL_WIDTH = 96;
const MODEL_HEIGHT = 96;

let classifier;
const video = document.getElementById('webcam');
const resultsDiv = document.getElementById('results');

/**
 * 1. 웹캠 설정
 */
async function setupWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: MODEL_WIDTH * 4, height: MODEL_HEIGHT * 4 } 
        });
        video.srcObject = stream;
        return new Promise((resolve) => video.onloadedmetadata = resolve);
    } catch (err) {
        throw new Error("웹캠 접근 권한이 필요합니다: " + err.message);
    }
}

/**
 * 2. 추론 루프 (실제 분석 단계)
 */
async function runInference() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = MODEL_WIDTH;
    canvas.height = MODEL_HEIGHT;

    console.log("추론 루프 시작");

    while (true) {
        // 비디오 프레임을 캔버스에 모델 사이즈로 그림
        ctx.drawImage(video, 0, 0, MODEL_WIDTH, MODEL_HEIGHT);
        
        // 픽셀 데이터 추출 (RGBA -> RGB 변환)
        const imageData = ctx.getImageData(0, 0, MODEL_WIDTH, MODEL_HEIGHT).data;
        const pixels = [];
        for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            // Edge Impulse 모델 형식 (0xRRGGBB)
            pixels.push((r << 16) + (g << 8) + b);
        }

        // 분류 실행
        const result = classifier.classify(pixels);
        
        // 결과 출력
        if (result.results && result.results.length > 0) {
            const top = result.results.sort((a, b) => b.value - a.value)[0];
            resultsDiv.innerText = `${top.label}: ${(top.value * 100).toFixed(1)}%`;
        }

        // 브라우저가 다음 프레임을 그릴 준비가 될 때까지 대기
        await new Promise(resolve => requestAnimationFrame(resolve));
    }
}

/**
 * 3. 초기화 (Module 대기 로직 포함)
 */
async function init() {
    try {
        resultsDiv.innerText = "모델 찾는 중...";

        // 1. 라이브러리가 준비될 때까지 최대 5초간 대기
        const findClassifier = () => {
            return new Promise((resolve, reject) => {
                let attempts = 0;
                const check = async () => {
                    attempts++;
                    
                    // 후보 1: 전역 변수
                    if (typeof EdgeImpulseClassifier !== 'undefined') {
                        return resolve(new EdgeImpulseClassifier());
                    }
                    // 후보 2: Module 함수형 (최신)
                    if (typeof Module === 'function') {
                        const m = await Module();
                        if (m.EdgeImpulseClassifier) return resolve(new m.EdgeImpulseClassifier());
                    }
                    // 후보 3: Module 객체형
                    if (typeof Module === 'object' && Module.EdgeImpulseClassifier) {
                        return resolve(new Module.EdgeImpulseClassifier());
                    }

                    if (attempts > 50) return reject(new Error("라이브러리 구조를 찾을 수 없습니다."));
                    setTimeout(check, 100);
                };
                check();
            });
        };

        classifier = await findClassifier();
        await classifier.init();
        
        await setupWebcam();
        resultsDiv.innerText = "추론 중...";
        runInference();
    } catch (err) {
        console.error(err);
        resultsDiv.innerText = "실패: " + err.message;
    }
}
// 페이지 로드 시 실행
window.onload = init;