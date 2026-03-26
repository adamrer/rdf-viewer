# --- Build

FROM node:24 AS build

WORKDIR /opt/vite

# copy the project
COPY . .

# install dependencies from package-lock.json
RUN npm ci
 
# build the application
RUN npm run build


# --- Deployment

FROM nginx:1.28.3

# copy the built application to the web server
COPY --from=build ./opt/vite/dist /usr/share/nginx/html

# expose the application on port 80
EXPOSE 80

# start the web server
CMD ["nginx", "-g", "daemon off;"]