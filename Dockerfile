# Use lightweight official Nginx image
FROM nginx:alpine

# Remove default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy your website files into Nginx web root
COPY . /usr/share/nginx/html

# Expose port 80 (CapRover expects this)
EXPOSE 80

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
