FROM node:XXXX-alpine

WORKDIR /usr/src/app
COPY . /usr/src/app

RUN npm install -g npm@latest
RUN npm clean-install
RUN npm run build

# Allow GID=0 to modify files/dirs.  Mainly for OpenShift but can be used
# elsewhere.
RUN chgrp -R 0 /usr/src/app && \
    chmod -R g=u /usr/src/app

EXPOSE 5555
CMD ["npm", "start"]