pipeline {
    agent any

    environment {
        REGISTRY = "10.43.252.86:5000"
        APP_NAME = "social-media"
        NAMESPACE = "social-media"
    }

    stages {
        stage('Build Backend') {
            steps {
                script {
                    dir('backend') {
                        sh "docker build -t ${REGISTRY}/${APP_NAME}-backend:latest ."
                    }
                }
            }
        }

        stage('Build Frontend') {
            steps {
                script {
                    dir('frontend') {
                        sh "docker build -t ${REGISTRY}/${APP_NAME}-frontend:latest ."
                    }
                }
            }
        }

        stage('Push to Registry') {
            steps {
                sh "docker push ${REGISTRY}/${APP_NAME}-backend:latest"
                sh "docker push ${REGISTRY}/${APP_NAME}-frontend:latest"
            }
        }

        stage('Deploy') {
            steps {
                sh "helm upgrade --install ${APP_NAME} '/Volumes/SSDX 1/codes/k3s/infra/helm/charts/social-media' -n ${NAMESPACE}"
            }
        }
    }

    post {
        success {
            echo "Deployment successful!"
        }
        failure {
            echo "Deployment failed."
        }
    }
}
