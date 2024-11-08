export DUID=$(id -u) 
# 6 is the disk group on most distros, YMMV
export DGID=6 # $(id -g) 
docker compose up -d
