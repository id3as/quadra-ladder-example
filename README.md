# Starting and stopping

Under the hood this is just a docker compose up using the docker-compose.yml in this repository. For convenience, an up.sh and stop.sh are provided to make sure the container is ran under a sensible user account.

Spinning it up

```
./up.sh
```


Stopping it

```
./down.sh 
```

You can see what is currenly running with

```
docker ps
```

# Changing it


Make your change and then run

```
npx tsc
```

Note any errors that occur and fix the code accordingly :). 

To commit these changes to a fresh docker image so you can run with them

```
npm run build
```


Then you can just do ./run.sh and the containers will be (re)started with your latest ladders.

# Deinterlace
We are using a software video decode explicitly, feeding into a software videoTransform to do deinterlace. Currently the algorithm being used is 'yadif', documentation for changing this can be found here

https://docs.norsk.video/media-sdk/latest/norsk-sdk.deinterlacesettings.html

# Notes





