import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiPlay, FiX } from "react-icons/fi";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/autoplay";

import TestimonialServices from "@services/TestimonialServices";
import CMSkeleton from "@components/preloader/CMSkeleton";
import SectionHeader from "@components/common/SectionHeader";
import useGetSetting from "@hooks/useGetSetting";
import useUtilsFunction from "@hooks/useUtilsFunction";

const TestimonialsSection = () => {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { storeCustomizationSetting } = useGetSetting();
  const { showingTranslateValue } = useUtilsFunction();

  const {
    data: testimonials,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["testimonials"],
    queryFn: async () => await TestimonialServices.getPublicTestimonials(),
  });

  const handleVideoClick = (testimonial) => {
    setSelectedVideo(testimonial);
    setIsFullscreen(true);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    setSelectedVideo(null);
  };

  const getVideoThumbnail = (videoUrl) => {
    if (!videoUrl) return null;
    
    // Check if it's a YouTube URL (including Shorts)
    const youtubeMatch = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([^&\n?#]+)/);
    if (youtubeMatch) {
      return `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`;
    }
    
    // For direct video files, we'll use a placeholder or try to get a frame
    // You can enhance this by generating thumbnails on upload
    return null;
  };

  const isVideoUrl = (url = "") => {
    if (!url) return false;
    const lowered = url.toLowerCase();
    return lowered.includes(".mp4") || lowered.includes(".mov") || lowered.includes(".webm");
  };

  const isYoutubeUrl = (url = "") => {
    if (!url) return false;
    const lowered = url.toLowerCase();
    return lowered.includes("youtube.com") || lowered.includes("youtu.be");
  };

  const getYoutubeEmbedUrl = (url = "") => {
    if (!isYoutubeUrl(url)) return null;
    // Match YouTube URLs including Shorts
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([^&\n?#]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-store-50 lg:py-16 py-10">
        <div className="mx-auto max-w-screen-2xl px-3 sm:px-10">
          <CMSkeleton count={3} height={20} error={error} loading={isLoading} />
        </div>
      </div>
    );
  }

  if (error || !testimonials || testimonials.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-store-50 lg:py-16 py-10">
        <div className="mx-auto max-w-screen-2xl px-3 sm:px-10">
          <div className="text-left mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              {showingTranslateValue(storeCustomizationSetting?.home?.testimonial_title) || "What our customers have to say"}
            </h2>
            <p className="text-lg text-gray-600">
              {showingTranslateValue(storeCustomizationSetting?.home?.testimonial_description) || "Hear from our satisfied customers"}
            </p>
          </div>

          <div className="relative">
            <Swiper
              modules={[Navigation, Autoplay]}
              spaceBetween={24}
              slidesPerView={1}
              breakpoints={{
                640: { slidesPerView: 2 },
                1024: { slidesPerView: 3 },
              }}
              autoplay={{ delay: 3000, disableOnInteraction: false }}
              navigation={{
                prevEl: '.prev-testimonial',
                nextEl: '.next-testimonial',
              }}
              className="testimonial-swiper py-2"
            >
            {testimonials.map((testimonial) => {
              const thumbnail = getVideoThumbnail(testimonial.video);
              const isYoutube = isYoutubeUrl(testimonial.video);
              const isDirectVideo = isVideoUrl(testimonial.video);

              return (
                <SwiperSlide key={testimonial._id}>
                <div
                  className={`relative rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gray-900 ${
                    !isYoutube ? "group cursor-pointer" : ""
                  }`}
                  onClick={!isYoutube ? () => handleVideoClick(testimonial) : undefined}
                >
                  {/* Video Container */}
                  <div className="relative w-full aspect-[50/29] bg-gray-900 overflow-hidden">
                    {isYoutube ? (
                      <iframe
                        src={getYoutubeEmbedUrl(testimonial.video)?.replace('?autoplay=1', '')}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={showingTranslateValue(testimonial.title)}
                      />
                    ) : isDirectVideo ? (
                      <video
                        src={testimonial.video}
                        className="w-full h-full object-cover"
                        controls
                        playsInline
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : thumbnail ? (
                      <>
                        <Image
                          src={thumbnail}
                          alt={showingTranslateValue(testimonial.title)}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                        {/* Play Button */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center shadow-2xl group-hover:bg-store-50 group-hover:scale-110 transition-all duration-300 border-4 border-white/20">
                            <FiPlay className="text-store-500 text-3xl md:text-4xl ml-1 group-hover:text-store-600" />
                          </div>
                        </div>
                        {/* Title Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 to-transparent">
                          <h3 className="text-white font-bold text-lg md:text-xl leading-tight">
                            {showingTranslateValue(testimonial.title)}
                          </h3>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-[300px] bg-gradient-to-br from-store-400 to-store-600 flex items-center justify-center">
                        <FiPlay className="text-white text-6xl opacity-50" />
                      </div>
                    )}
                  </div>
                </div>
                </SwiperSlide>
              );
            })}
            </Swiper>
            
            {/* Custom Navigation Buttons */}
            <button className="prev-testimonial absolute top-1/2 -left-4 z-10 bg-white shadow-lg border border-gray-100 rounded-full p-3 hover:bg-store-50 transition-colors transform -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed text-store-600 hover:text-store-700">
              <IoChevronBack className="text-xl" />
            </button>
            <button className="next-testimonial absolute top-1/2 -right-4 z-10 bg-white shadow-lg border border-gray-100 rounded-full p-3 hover:bg-store-50 transition-colors transform -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed text-store-600 hover:text-store-700">
              <IoChevronForward className="text-xl" />
            </button>
          </div>
        </div>
      </div>

      {/* Full Screen Video Modal */}
      {isFullscreen && selectedVideo && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4"
          onClick={closeFullscreen}
        >
          <button
            onClick={closeFullscreen}
            className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2"
            aria-label="Close video"
          >
            <FiX className="text-2xl" />
          </button>

          <div
            className="w-full max-w-6xl aspect-video relative"
            onClick={(e) => e.stopPropagation()}
          >
            {isYoutubeUrl(selectedVideo.video) ? (
              <iframe
                src={getYoutubeEmbedUrl(selectedVideo.video)}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={showingTranslateValue(selectedVideo.title)}
              />
            ) : (
              <video
                src={selectedVideo.video}
                controls
                autoPlay
                className="w-full h-full rounded-lg"
                controlsList="nodownload"
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default TestimonialsSection;

